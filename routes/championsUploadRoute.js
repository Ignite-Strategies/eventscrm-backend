import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { readCSV } from '../services/csvReader.js';
import { getContactFieldMapping, normalizeContactRecord } from '../services/eventAttendeeCsvFieldMapper.js';
import { validateContactBatch } from '../services/eventAttendeeCsvValidator.js';
import { bulkUpsertGeneralContacts } from '../services/eventAttendeeCsvMutation.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Configure multer for file uploads (CSV + attachments)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/champions';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV for champions list and common document types for attachments
    const allowedTypes = /csv|pdf|doc|docx|jpg|jpeg|png|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: CSV, PDF, DOC, DOCX, JPG, PNG, TXT'));
    }
  }
});

/**
 * POST /api/champions/upload
 * Upload champions CSV and optional attachments
 * Champions are high-value contacts who help spread the word about events
 */
router.post('/upload', upload.fields([
  { name: 'csv', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]), async (req, res) => {
  try {
    const { orgId, eventId, notes } = req.body;
    
    console.log('🏆 CHAMPIONS UPLOAD: Starting upload for orgId:', orgId, 'eventId:', eventId);
    
    if (!req.files || !req.files.csv) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const csvFile = req.files.csv[0];
    const attachments = req.files.attachments || [];
    
    console.log('📎 Attachments:', attachments.length);
    
    // 1. Read CSV from disk
    const csvBuffer = fs.readFileSync(csvFile.path);
    const readResult = readCSV(csvBuffer);
    
    if (!readResult.success) {
      // Clean up uploaded files
      fs.unlinkSync(csvFile.path);
      attachments.forEach(att => fs.unlinkSync(att.path));
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize records
    const normalizedRecords = readResult.records.map(record => normalizeContactRecord(record));
    
    // 3. Validate records
    const validationResult = validateContactBatch(normalizedRecords);
    
    if (validationResult.errorCount > 0) {
      console.log('⚠️ Validation errors:', validationResult.errors);
      // Still continue with valid records
    }
    
    // 4. Bulk upsert Contacts
    const mutationResult = await bulkUpsertGeneralContacts(validationResult.validRecords);
    
    if (!mutationResult.success) {
      // Clean up uploaded files
      fs.unlinkSync(csvFile.path);
      attachments.forEach(att => fs.unlinkSync(att.path));
      return res.status(500).json({ error: mutationResult.error });
    }
    
    // 5. Create EventAttendee records as CHAMPIONS
    const championResults = [];
    const attachmentPaths = attachments.map(att => ({
      originalName: att.originalname,
      filename: att.filename,
      path: att.path,
      size: att.size,
      mimetype: att.mimetype
    }));
    
    for (const contactData of validationResult.validRecords) {
      try {
        // Find the contact
        const contact = await prisma.contact.findUnique({
          where: { email: contactData.email }
        });
        
        if (contact) {
          // Create EventAttendee as CHAMPION
          const eventAttendee = await prisma.eventAttendee.create({
            data: {
              contactId: contact.id,
              eventId: eventId,
              currentStage: 'aware',  // Champions start at "aware" stage
              audienceType: 'champions',  // CHAMPIONS audience type!
              orgId: orgId,
              notes: notes ? JSON.stringify({ 
                generalNotes: notes,
                attachments: attachmentPaths,
                uploadedAt: new Date()
              }) : JSON.stringify({ 
                attachments: attachmentPaths,
                uploadedAt: new Date()
              })
            }
          });
          
          championResults.push({
            contact: contact.email,
            attendeeId: eventAttendee.id
          });
          
          console.log('🏆 Created CHAMPION:', contact.email);
        }
        
      } catch (error) {
        console.error('❌ Error creating champion for contact:', contactData.email, error);
      }
    }
    
    // Clean up CSV file (but keep attachments - they're referenced)
    fs.unlinkSync(csvFile.path);
    
    res.json({
      success: true,
      message: `Uploaded ${championResults.length} champions`,
      champions: championResults,
      attachments: attachmentPaths.length,
      attachmentDetails: attachmentPaths,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      validCount: validationResult.validCount,
      errorCount: validationResult.errorCount,
      errors: validationResult.errors
    });
    
  } catch (error) {
    console.error('❌ CHAMPIONS UPLOAD ERROR:', error);
    
    // Clean up any uploaded files on error
    try {
      if (req.files) {
        if (req.files.csv) {
          req.files.csv.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        if (req.files.attachments) {
          req.files.attachments.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      }
    } catch (cleanupError) {
      console.error('❌ Cleanup error:', cleanupError);
    }
    
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

/**
 * GET /api/champions/attachments/:eventId/:attendeeId
 * Get attachments for a specific champion
 */
router.get('/attachments/:eventId/:attendeeId', async (req, res) => {
  try {
    const { eventId, attendeeId } = req.params;
    
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: attendeeId },
      include: { contact: true }
    });
    
    if (!attendee) {
      return res.status(404).json({ error: 'Champion not found' });
    }
    
    if (attendee.eventId !== eventId) {
      return res.status(403).json({ error: 'Attendee not associated with this event' });
    }
    
    // Parse notes to get attachments
    const notes = attendee.notes ? JSON.parse(attendee.notes) : {};
    const attachments = notes.attachments || [];
    
    res.json({
      success: true,
      champion: {
        email: attendee.contact.email,
        name: `${attendee.contact.firstName} ${attendee.contact.lastName}`
      },
      attachments
    });
    
  } catch (error) {
    console.error('❌ Error fetching attachments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/champions/download/:filename
 * Download a specific attachment file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./uploads/champions', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
    
  } catch (error) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/champions/list/:eventId
 * List all champions for an event
 */
router.get('/list/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const champions = await prisma.eventAttendee.findMany({
      where: {
        eventId: eventId,
        audienceType: 'champions'
      },
      include: {
        contact: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const championsWithAttachments = champions.map(champ => {
      const notes = champ.notes ? JSON.parse(champ.notes) : {};
      return {
        id: champ.id,
        email: champ.contact.email,
        name: `${champ.contact.firstName} ${champ.contact.lastName}`,
        stage: champ.currentStage,
        attachmentCount: notes.attachments?.length || 0,
        uploadedAt: notes.uploadedAt || champ.createdAt
      };
    });
    
    res.json({
      success: true,
      total: championsWithAttachments.length,
      champions: championsWithAttachments
    });
    
  } catch (error) {
    console.error('❌ Error listing champions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

