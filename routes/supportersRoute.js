import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';
import { bulkUpsertSupporters, createSupporter, deleteSupporter, getSupportersByOrg } from '../services/supporterMutation.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create single supporter
router.post('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await createSupporter(orgId, req.body);
    
    if (result.success) {
      res.json(result.supporter);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk CSV upload
router.post('/:orgId/supporters/csv', upload.single('file'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    console.log('CSV Upload Request:', { orgId, file: req.file ? req.file.originalname : 'No file' });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // 1. Read CSV
    const readResult = readCSV(req.file.buffer);
    if (!readResult.success) {
      return res.status(400).json({ error: readResult.error });
    }
    
    // 2. Normalize field names
    const normalizedRecords = readResult.records.map(record => normalizeRecord(record));
    
    // 3. Validate records
    const validationResult = validateBatch(normalizedRecords);
    console.log('CSV Processing Results:', { 
      total: validationResult.totalProcessed,
      valid: validationResult.validCount,
      errors: validationResult.errorCount 
    });
    
    // 4. Database mutation
    const mutationResult = await bulkUpsertSupporters(orgId, validationResult.validRecords);
    
    if (!mutationResult.success) {
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
    res.status(400).json({ error: error.message });
  }
});

// List supporters
router.get('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { search, tags } = req.query;
    
    const query = { orgId };
    
    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    const supporters = await Supporter.find(query).sort({ createdAt: -1 });
    res.json(supporters);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete supporter
router.delete('/supporters/:supporterId', async (req, res) => {
  try {
    const { supporterId } = req.params;
    const result = await deleteSupporter(supporterId);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Supporter deleted',
        deletedSupporter: result.deletedSupporter
      });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

