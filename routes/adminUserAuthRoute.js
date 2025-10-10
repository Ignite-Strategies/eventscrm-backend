import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * AUTH ROUTE - Firebase authentication flow ONLY
 * Separate from contact management routes
 */

/**
 * Find or Create OrgMember by Firebase ID
 * Called after Firebase auth (signup/signin)
 */
router.post('/findOrCreate', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    console.log('🔐 AUTH: FindOrCreate for firebaseId:', firebaseId);
    
    // Find existing OrgMember by firebaseId
    let orgMember = await prisma.orgMember.findUnique({
      where: { firebaseId }
    });
    
    if (orgMember) {
      console.log('✅ AUTH: Existing user found:', orgMember.email);
      
      // Check if they have an Admin record, create one if not
      if (orgMember.contactId) {
        const existingAdmin = await prisma.admin.findFirst({
          where: { contactId: orgMember.contactId }
        });
        
        if (!existingAdmin) {
          console.log('📝 AUTH: Creating missing Admin record for existing user');
          await prisma.admin.create({
            data: {
              contactId: orgMember.contactId,
              orgId: orgMember.orgId,
              role: 'super_admin',
              permissions: {
                canCreateForms: true,
                canEditForms: true,
                canDeleteForms: true,
                canManageUsers: true,
                canViewAnalytics: true
              },
              isActive: true
            }
          });
          console.log('✅ AUTH: Admin record created for existing user');
        }
      }
      
      return res.json(orgMember);
    }
    
    // Create new OrgMember (auth fields only, rest null)
    console.log('📝 AUTH: Creating new user for:', email);
    orgMember = await prisma.orgMember.create({
      data: {
        firebaseId,
        email: email || '',
        firstName: firstName || '',
        lastName: lastName || '',
        photoURL: photoURL || null,
        role: null,
        orgId: null
        // All other contact fields default to null/false/0
      }
    });
    
    console.log('✅ AUTH: New user created:', orgMember.id);
    
    // Don't create Contact/Admin until they have an org
    // Will be created when they create/join an org
    
    res.status(201).json(orgMember);
    
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

