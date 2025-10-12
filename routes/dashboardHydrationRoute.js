import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * Universal Hydration Route
 * Returns all data needed for the dashboard in one call
 * Looks up by firebaseId from the Firebase token!
 */
router.get('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    
    console.log('🚀 UNIVERSAL HYDRATION for firebaseId:', firebaseId);
    
    // Get OrgMember by firebaseId
    const orgMember = await prisma.orgMember.findUnique({
      where: { firebaseId: firebaseId },
      include: {
        contact: true,
        org: true
      }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'OrgMember not found for this Firebase user' });
    }
    
    // Get organization data
    const org = orgMember.org;
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    console.log('🔍 Hydration Debug:', {
      firebaseId,
      orgMemberId: orgMember.id,
      contactId: orgMember.contactId,
      orgId: orgMember.orgId,
      hasOrg: !!org,
      orgName: org?.name
    });
    
    // Get events for the org
    const events = await prisma.event.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get all org members (team members in this org)
    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: {
        contact: true
      }
    });
    
    // Get admin record by firebaseId (Admin has direct orgId and eventId!)
    const admin = await prisma.admin.findFirst({
      where: { firebaseId: firebaseId }
    });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found for this Firebase user' });
    }
    
    // Return the 3 core IDs from Admin + admin object
    const hydrationData = {
      adminId: admin.id,
      orgId: admin.orgId,
      eventId: admin.eventId,
      admin: {
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive
      }
    };
    
    console.log('✅ Hydration complete:', {
      orgMember: orgMember.id,
      contactId: orgMember.contactId,
      adminId: admin ? admin.id : 'none',
      org: org.name,
      events: events.length,
      orgMembers: orgMembers.length
    });
    
    res.json(hydrationData);
    
  } catch (error) {
    console.error('❌ Hydration error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
