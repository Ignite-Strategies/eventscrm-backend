import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Get first organization (for login check)
router.get('/first', async (req, res) => {
  try {
    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    if (!org) return res.status(404).json({ error: 'No organization found' });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create organization
router.post('/', async (req, res) => {
  try {
    const org = await prisma.organization.create({
      data: req.body
    });
    res.status(201).json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get organization
router.get('/:orgId', async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId }
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update organization
router.patch('/:orgId', async (req, res) => {
  try {
    const org = await prisma.organization.update({
      where: { id: req.params.orgId },
      data: req.body
    });
    res.json(org);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
