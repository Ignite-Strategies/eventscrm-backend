import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * File Upload Service for Campaign Attachments
 */
class FileUploadService {
  
  /**
   * Configure multer for file uploads
   */
  static getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const campaignId = req.body.campaignId || req.params.campaignId;
        const uploadPath = path.join(process.cwd(), 'uploads', 'campaigns', campaignId || 'temp');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, extension);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
        
        cb(null, `${sanitizedName}_${timestamp}${extension}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Allow common file types for campaigns
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  }

  /**
   * Save file metadata to database
   */
  static async saveFileMetadata(fileData, campaignId, adminId) {
    try {
      const fileRecord = await prisma.campaignAttachment.create({
        data: {
          campaignId: campaignId,
          adminId: adminId,
          filename: fileData.filename,
          originalName: fileData.originalname,
          mimeType: fileData.mimetype,
          filePath: fileData.path,
          fileSize: fileData.size,
          uploadedAt: new Date()
        }
      });
      
      console.log('✅ File metadata saved:', fileRecord.id);
      return fileRecord;
    } catch (error) {
      console.error('❌ Error saving file metadata:', error);
      throw error;
    }
  }

  /**
   * Get files for a campaign
   */
  static async getCampaignFiles(campaignId) {
    try {
      const files = await prisma.campaignAttachment.findMany({
        where: { campaignId: campaignId },
        orderBy: { uploadedAt: 'desc' }
      });
      
      return files;
    } catch (error) {
      console.error('❌ Error getting campaign files:', error);
      throw error;
    }
  }

  /**
   * Delete a file and its metadata
   */
  static async deleteFile(fileId, adminId) {
    try {
      const fileRecord = await prisma.campaignAttachment.findUnique({
        where: { id: fileId }
      });
      
      if (!fileRecord) {
        throw new Error('File not found');
      }
      
      // Delete physical file
      if (fs.existsSync(fileRecord.filePath)) {
        fs.unlinkSync(fileRecord.filePath);
      }
      
      // Delete database record
      await prisma.campaignAttachment.delete({
        where: { id: fileId }
      });
      
      console.log('✅ File deleted:', fileId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get file content for sending
   */
  static getFileContent(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('❌ Error reading file:', error);
      throw error;
    }
  }
}

export default FileUploadService;
