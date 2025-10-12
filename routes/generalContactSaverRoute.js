import express from 'express';
import multer from 'multer';
import { readGeneralContactCSV } from '../services/generalContactCsvReader.js';
import { normalizeContactRecord } from '../services/generalContactCsvNormalizer.js';
import { validateContactBatch } from '../services/generalContactValidator.js';
import { bulkUpsertGeneralContacts } from '../services/generalContactMutation.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /contacts/save
 * 
 * Actually save the contacts after user confirms "looks good"
 * Uses the same CSV processing but saves to database
 */
router.post('/save', upload.single('file'), async (req, res) => {
  try {
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    console.log('💾 General Contact save for org:', orgId);
    
    // 1. Read CSV (same as preview)
    const readResult = readGeneralContactCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize field names (same as preview)
    const normalizedRecords = readResult.records.map(record => normalizeContactRecord(record));
    
    // 3. Validate records (same as preview)
    const validationResult = validateContactBatch(normalizedRecords);
    console.log('📊 General Contact Save Results:', { 
      total: validationResult.totalProcessed,
      valid: validationResult.validCount,
      errors: validationResult.errorCount 
    });
    
    // 4. Save to database
    console.log('🚀 GENERAL CONTACT SAVER: About to call bulkUpsertGeneralContacts with', validationResult.validRecords.length, 'records');
    const mutationResult = await bulkUpsertGeneralContacts(orgId, validationResult.validRecords);
    console.log('🚀 GENERAL CONTACT SAVER: Mutation result:', mutationResult);
    
    if (!mutationResult.success) {
      console.error('🚀 GENERAL CONTACT SAVER: Mutation failed:', mutationResult.error);
      return res.status(400).json({ error: mutationResult.error });
    }
    
    res.json({
      success: true,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      total: validationResult.validCount,
      errors: validationResult.errors
    });
    
  } catch (error) {
    console.error('❌ General Contact save error:', error);
    res.status(500).json({ error: 'Save failed: ' + error.message });
  }
});

export default router;


