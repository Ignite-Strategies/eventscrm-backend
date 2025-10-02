import express from 'express';
import multer from 'multer';
import Contact from '../models/Contact.js';
import { parseContactsCSV } from '../services/csvService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upsert single contact
router.post('/:orgId/contacts', async (req, res) => {
  try {
    const { orgId } = req.params;
    const contactData = { ...req.body, orgId };
    
    // Upsert by email
    const contact = await Contact.findOneAndUpdate(
      { orgId, email: contactData.email },
      contactData,
      { upsert: true, new: true, runValidators: true }
    );
    
    res.json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk CSV upload
router.post('/:orgId/contacts/csv', upload.single('file'), async (req, res) => {
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
    
    // Bulk upsert
    const operations = contacts.map(c => ({
      updateOne: {
        filter: { orgId, email: c.email },
        update: { ...c, orgId },
        upsert: true
      }
    }));
    
    const result = await Contact.bulkWrite(operations);
    
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

// List contacts
router.get('/:orgId/contacts', async (req, res) => {
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
    
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

