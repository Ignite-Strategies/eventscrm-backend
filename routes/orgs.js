import express from 'express';
import Organization from '../models/Organization.js';

const router = express.Router();

// Create organization
router.post('/', async (req, res) => {
  try {
    const org = new Organization(req.body);
    await org.save();
    res.status(201).json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get organization
router.get('/:orgId', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update organization
router.patch('/:orgId', async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.params.orgId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

