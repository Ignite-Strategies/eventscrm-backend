import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { normalizeRecord } from '../services/csvNormalizer.js';
import { validateBatch } from '../services/csvValidator.js';
import { bulkUpsertSupporters, createSupporter, deleteSupporter, getSupportersByOrg } from '../services/supporterMutation.js';
import Supporter from '../models/Supporter.js'; // Import Supporter model for PATCH

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Migration route to update old engagement categories
router.post('/migrate-engagement-categories', async (req, res) => {
  try {
    console.log('🔄 MIGRATION: Starting engagement category migration');
    
    const result = await Supporter.updateMany(
      { categoryOfEngagement: "general" },
      { $set: { categoryOfEngagement: "medium" } }
    );
    
    console.log('🔄 MIGRATION: Updated', result.modifiedCount, 'supporters from "general" to "medium"');
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} supporters from "general" to "medium"`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('🔄 MIGRATION ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route to check database connection
router.get('/test-db/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('🧪 TEST: Testing database connection for orgId:', orgId);
    
    const result = await getSupportersByOrg(orgId);
    console.log('🧪 TEST: Database test result:', result);
    
    res.json({
      success: true,
      message: 'Database connection working',
      orgId,
      supportersCount: result.supporters?.length || 0
    });
  } catch (error) {
    console.error('🧪 TEST ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    console.log('🚀 ROUTE: About to call bulkUpsertSupporters with', validationResult.validRecords.length, 'records');
    const mutationResult = await bulkUpsertSupporters(orgId, validationResult.validRecords);
    console.log('🚀 ROUTE: Mutation result:', mutationResult);
    
    if (!mutationResult.success) {
      console.error('🚀 ROUTE: Mutation failed:', mutationResult.error);
      return res.status(400).json({ error: mutationResult.error });
    }
    
    // 5. Verify data was actually saved
    console.log('🚀 ROUTE: Verifying data was saved...');
    const verifyResult = await getSupportersByOrg(orgId);
    console.log('🚀 ROUTE: Verification - supporters count:', verifyResult.supporters?.length || 0);
    
    res.json({
      success: true,
      inserted: mutationResult.inserted,
      updated: mutationResult.updated,
      total: validationResult.validCount,
      errors: validationResult.errors,
      verified: verifyResult.supporters?.length || 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List supporters
router.get('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('📋 GET: Fetching supporters for orgId:', orgId);
    
    const result = await getSupportersByOrg(orgId);
    console.log('📋 GET: Database result:', result);
    
    if (result.success) {
      console.log('📋 GET: Returning', result.supporters.length, 'supporters');
      res.json(result.supporters);
    } else {
      console.error('📋 GET: Database error:', result.error);
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('📋 GET: Route error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update supporter field (inline editing)
router.post('/supporters/:supporterId/update', async (req, res) => {
  try {
    const { supporterId } = req.params;
    const { field, value } = req.body;
    
    console.log('✏️ PATCH: Updating supporter', supporterId, 'field:', field, 'value:', value);
    console.log('✏️ PATCH: Request body:', req.body);
    
    // Validate required fields
    if (!field) {
      return res.status(400).json({ error: 'Field is required' });
    }
    
    const updateData = { [field]: value };
    console.log('✏️ PATCH: Update data:', updateData);
    
    const supporter = await Supporter.findByIdAndUpdate(
      supporterId, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!supporter) {
      console.log('✏️ PATCH: Supporter not found with ID:', supporterId);
      return res.status(404).json({ error: 'Supporter not found' });
    }
    
    console.log('✏️ PATCH: Successfully updated supporter:', supporter._id);
    res.json({
      success: true,
      supporter
    });
  } catch (error) {
    console.error('✏️ PATCH ERROR:', error);
    console.error('✏️ PATCH ERROR Stack:', error.stack);
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

