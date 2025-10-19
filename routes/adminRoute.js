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

// GET /api/admin/org/:orgId - Get all admins for an organization
router.get('/org/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const admins = await prisma.admin.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(admins);
  } catch (error) {
    console.error('❌ Get org admins error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/admin - Create new admin
router.post('/', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, orgId, role, status } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`📝 Creating new admin: ${email}`);
    
    const newAdmin = await prisma.admin.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        orgId: orgId || null,
        role: role || 'member',
        status: status || 'active'
      }
    });
    
    console.log('✅ Admin created:', newAdmin.id);
    res.status(201).json(newAdmin);
    
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/admin/:adminId - Update admin profile
router.patch('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { email, firstName, lastName, phone, photoURL, role, status } = req.body;
    
    console.log(`📝 Updating admin profile: ${adminId}`);
    
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        photoURL: photoURL || undefined,
        role: role || undefined,
        status: status || undefined
      }
    });
    
    console.log('✅ Admin profile updated:', updatedAdmin.id);
    res.json(updatedAdmin);
    
  } catch (error) {
    console.error('❌ Update admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/admin/:adminId - Delete admin
router.delete('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    
    console.log(`🗑️ Deleting admin: ${adminId}`);
    
    await prisma.admin.delete({
      where: { id: adminId }
    });
    
    console.log('✅ Admin deleted');
    res.json({ message: 'Admin deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
