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
    
    // Find existing Admin by firebaseId first
    let existingAdmin = await prisma.admin.findFirst({
      where: { firebaseId }
    });
    
    if (existingAdmin) {
      console.log('✅ AUTH: Existing Admin found:', existingAdmin.id);
      return res.json({
        id: existingAdmin.id,
        firebaseId: existingAdmin.firebaseId,
        role: existingAdmin.role,
        orgId: existingAdmin.orgId,
        isAdmin: true
      });
    }
    
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
        photoURL: photoURL || null,
        role: null,
        orgId: null
        // All other contact fields default to null/false/0
      }
    });
    
    console.log('✅ AUTH: New user created:', orgMember.id);
    
    // Create Contact record (orgId can be null now!)
    const contact = await prisma.contact.create({
      data: {
        orgId: orgMember.orgId, // null initially
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        phone: null
      }
    });
    
    // Link OrgMember to Contact
    await prisma.orgMember.update({
      where: { id: orgMember.id },
      data: { contactId: contact.id }
    });
    
    console.log('✅ AUTH: Contact created and linked:', contact.id);
    
    // Create Admin record (orgId can be null, will update when org assigned)
    const admin = await prisma.admin.create({
      data: {
        contactId: contact.id,
        firebaseId: firebaseId, // Link to Firebase user
        orgId: orgMember.orgId, // null initially
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
    
    console.log('✅ AUTH: Admin created:', admin.id);
    
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

