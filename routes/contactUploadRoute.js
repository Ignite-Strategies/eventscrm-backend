import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /contacts/upload
 * 
 * Basic CSV upload → Create Contact records only
 * No assignments, no complications, just contacts
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { orgId } = req.body;
    
    console.log('📁 Contact upload for org:', orgId);
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    // 1. Read CSV (existing service)
    const readResult = readCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize field names (existing service)
    const normalizedRecords = readResult.records.map(record => normalizeRecord(record));
    
    // 3. Validate records (existing service)
    const validationResult = validateBatch(normalizedRecords);
    console.log('📊 CSV Processing Results:', { 
      total: validationResult.totalProcessed,
      valid: validationResult.validCount,
      errors: validationResult.errorCount 
    });
    
    // 4. Create Contact records only (Prisma)
    const createdContacts = [];
    const errors = [];
    
    for (const record of validationResult.validRecords) {
      try {
        const contact = await prisma.contact.create({
          data: {
            orgId,
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            phone: record.phone || null
          }
        });
        createdContacts.push(contact);
      } catch (err) {
        if (err.code === 'P2002') {
          // Duplicate email - skip silently
          console.log('⚠️ Skipping duplicate email:', record.email);
          continue;
        }
        errors.push({
          email: record.email,
          error: err.message
        });
      }
    }
    
    console.log(`✅ Created ${createdContacts.length} contacts`);
    
    res.json({
      success: true,
      contacts: createdContacts,
      count: createdContacts.length,
      errors: errors.concat(validationResult.errors)
    });
    
  } catch (error) {
    console.error('❌ Contact upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

export default router;
