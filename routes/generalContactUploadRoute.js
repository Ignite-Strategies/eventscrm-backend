import express from 'express';
import multer from 'multer';
import { readGeneralContactCSV } from '../services/generalContactCsvReader.js';
import { normalizeContactRecord } from '../services/generalContactCsvNormalizer.js';
import { validateContactBatch } from '../services/generalContactValidator.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /contacts/preview
 * 
 * Parse CSV and return preview data for field matching
 * No saving - just preview and field mapping
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    console.log('📁 General Contact preview for file:', req.file.originalname);
    
    // 1. Read CSV
    const readResult = readGeneralContactCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize field names
    const normalizedRecords = readResult.records.map(record => normalizeContactRecord(record));
    
    // 3. Validate records
    const validationResult = validateContactBatch(normalizedRecords);
    console.log('📊 General Contact Preview Results:', { 
      total: validationResult.totalProcessed,
      valid: validationResult.validCount,
      errors: validationResult.errorCount 
    });
    
    // 4. Return preview data (first 5 records + field mapping)
    const previewData = validationResult.validRecords.slice(0, 5);
    const fieldMapping = readResult.headers.map(header => ({
      csvHeader: header,
      mappedField: normalizeContactRecord({ [header]: 'test' })[header] || 'unmapped'
    }));
    
    res.json({
      success: true,
      preview: previewData,
      fieldMapping,
      totalRecords: validationResult.validRecords.length,
      validCount: validationResult.validCount,
      errors: validationResult.errors,
      headers: readResult.headers
    });
    
  } catch (error) {
    console.error('❌ General Contact preview error:', error);
    res.status(500).json({ error: 'Preview failed: ' + error.message });
  }
});

export default router;
