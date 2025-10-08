import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Get admin by contactId
router.get('/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const admin = await prisma.admin.findFirst({
      where: { contactId },
      include: {
        contact: true,
        org: true
      }
    });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    console.error('❌ Get admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
