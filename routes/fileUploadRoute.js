import express from 'express';
import FileUploadService from '../services/fileUploadService.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * File Upload Routes for Campaign Attachments
 */

// Configure multer for file uploads
const upload = FileUploadService.getMulterConfig();

// POST /api/file-upload/campaign/:campaignId/upload
// Upload files for a campaign
router.post('/campaign/:campaignId/upload', upload.array('files', 5), async (req, res) => {
  try {
    const { campaignId } = req.params;
    const adminId = req.user?.adminId; // Assuming auth middleware sets req.user
    
    console.log('📎 Uploading files for campaign:', campaignId);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Verify campaign exists and user has access
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { org: true }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Save file metadata for each uploaded file
    const savedFiles = [];
    for (const file of req.files) {
      const fileRecord = await FileUploadService.saveFileMetadata(file, campaignId, adminId);
      savedFiles.push({
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        fileSize: fileRecord.fileSize,
        uploadedAt: fileRecord.uploadedAt
      });
    }
    
    console.log('✅ Files uploaded successfully:', savedFiles.length);
    
    res.json({
      success: true,
      message: `${savedFiles.length} file(s) uploaded successfully`,
      files: savedFiles
    });
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed: ' + error.message 
    });
  }
});

// GET /api/file-upload/campaign/:campaignId/files
// Get all files for a campaign
router.get('/campaign/:campaignId/files', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    console.log('📎 Getting files for campaign:', campaignId);
    
    const files = await FileUploadService.getCampaignFiles(campaignId);
    
    // Format response without file paths for security
    const formattedFiles = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      uploadedAt: file.uploadedAt
    }));
    
    res.json({
      success: true,
      files: formattedFiles
    });
    
  } catch (error) {
    console.error('❌ Error getting campaign files:', error);
    res.status(500).json({ 
      error: 'Failed to get campaign files: ' + error.message 
    });
  }
});

// DELETE /api/file-upload/file/:fileId
// Delete a specific file
router.delete('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const adminId = req.user?.adminId;
    
    console.log('🗑️ Deleting file:', fileId);
    
    await FileUploadService.deleteFile(fileId, adminId);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file: ' + error.message 
    });
  }
});

// GET /api/file-upload/file/:fileId/download
// Download a specific file
router.get('/file/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log('⬇️ Downloading file:', fileId);
    
    const fileRecord = await prisma.campaignAttachment.findUnique({
      where: { id: fileId }
    });
    
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file exists on disk
    const fs = require('fs');
    if (!fs.existsSync(fileRecord.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
    
    // Stream the file
    const fileContent = FileUploadService.getFileContent(fileRecord.filePath);
    res.send(fileContent);
    
  } catch (error) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({ 
      error: 'Failed to download file: ' + error.message 
    });
  }
});

export default router;
