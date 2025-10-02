import express from 'express';
import multer from 'multer';
import Supporter from '../models/Supporter.js';
import { parseContactsCSV } from '../services/csvService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upsert single supporter
router.post('/:orgId/supporters', async (req, res) => {
  try {
    const { orgId } = req.params;
    const supporterData = { ...req.body, orgId };
    
    // Upsert by email
    const supporter = await Supporter.findOneAndUpdate(
      { orgId, email: supporterData.email },
      supporterData,
      { upsert: true, new: true, runValidators: true }
    );
    
    res.json(supporter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk CSV upload
router.post('/:orgId/supporters/csv', upload.single('file'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { contacts, errors } = parseContactsCSV(req.file.buffer);
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing errors', 
        details: errors 
      });
    }
    
    // Bulk upsert supporters
    const operations = contacts.map(c => ({
      updateOne: {
        filter: { orgId, email: c.email },
        update: { ...c, orgId },
        upsert: true
      }
    }));
    
    const result = await Supporter.bulkWrite(operations);
    
    res.json({
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: contacts.length
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
        { name: new RegExp(search, 'i') },
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

export default router;

