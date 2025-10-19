import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * AUTH ROUTE - Firebase authentication flow ONLY
 * Admin-first architecture - no OrgMember, no Contact during signup
 */

/**
 * Find or Create Admin by Firebase ID
 * Called after Firebase auth (signup/signin)
 */
router.post('/findOrCreate', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    console.log('🔐 AUTH: FindOrCreate for firebaseId:', firebaseId);
    
    // 1. Find existing Admin by firebaseId first
    let admin = await prisma.admin.findFirst({
      where: { firebaseId }
    });
    
    if (admin) {
      console.log('✅ AUTH: Existing Admin found:', admin.id);
      return res.json({
        id: admin.id,
        firebaseId: admin.firebaseId,
        email: admin.email,
        firstName: admin.firstName,
        role: admin.role,
        orgId: admin.orgId,
        containerId: admin.containerId
      });
    }
    
    // 2. Find existing Admin by email (might have been pre-created by invite)
    admin = await prisma.admin.findFirst({
      where: { email }
    });
    
    if (admin) {
      console.log('✅ AUTH: Admin found by email - linking firebaseId:', admin.id);
      // Link firebaseId to existing Admin
      admin = await prisma.admin.update({
        where: { id: admin.id },
        data: { 
          firebaseId,
          photoURL: photoURL || undefined
        }
      });
      
      return res.json({
        id: admin.id,
        firebaseId: admin.firebaseId,
        email: admin.email,
        firstName: admin.firstName,
        role: admin.role,
        orgId: admin.orgId,
        containerId: admin.containerId
      });
    }
    
    // 3. No Admin found - Create new Admin with containerId
    console.log('📝 AUTH: Creating new Admin for:', email);
    
    // Get or create default F3 container (MVP - hardcoded)
    let container = await prisma.container.findFirst({
      where: { slug: 'f3-default' }
    });
    
    if (!container) {
      console.log('📝 AUTH: Creating default F3 container');
      container = await prisma.container.create({
        data: {
          name: 'F3',
          slug: 'f3-default',
          description: 'Default F3 container'
        }
      });
    }
    
    // Create Admin with containerId + firebaseId
    admin = await prisma.admin.create({
      data: {
        firebaseId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        photoURL: photoURL || null,
        containerId: container.id, // 🔥 Set containerId on signup!
        orgId: null, // Will be set when they create/join org
        role: 'owner', // First user = owner
        status: 'active'
      }
    });
    
    console.log('✅ AUTH: New Admin created:', admin.id, 'with containerId:', container.id);
    
    res.status(201).json({
      id: admin.id,
      firebaseId: admin.firebaseId,
      email: admin.email,
      firstName: admin.firstName,
      role: admin.role,
      orgId: admin.orgId,
      containerId: admin.containerId
    });
    
  } catch (error) {
    console.error('❌ AUTH: FindOrCreate error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get OrgMember by ID
 */
router.get('/profile/:orgMemberId', async (req, res) => {
  try {
    const orgMember = await prisma.orgMember.findUnique({
      where: { id: req.params.orgMemberId }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(orgMember);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

