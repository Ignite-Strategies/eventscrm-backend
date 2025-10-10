import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
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
    
    // 3. Filter for Contact fields only
    const contactRecords = [];
    const errors = [];
    
    for (const record of normalizedRecords) {
      // Extract only Contact fields
      const contactData = {
        firstName: record.firstName || '',
        lastName: record.lastName || '',
        email: record.email || '',
        phone: record.phone || null
      };
      
      // Basic validation
      if (!contactData.firstName || !contactData.lastName || !contactData.email) {
        errors.push({
          record: contactData,
          error: 'Missing required fields (firstName, lastName, email)'
        });
        continue;
      }
      
      contactRecords.push(contactData);
    }
    
    console.log('📊 Contact Processing Results:', { 
      total: readResult.records.length,
      valid: contactRecords.length,
      errors: errors.length 
    });
    
    // 3. Create Contact records only (Prisma)
    const createdContacts = [];
    
    for (const record of contactRecords) {
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
      errors: errors
    });
    
  } catch (error) {
    console.error('❌ Contact upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

export default router;
