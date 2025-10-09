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
    
    // Get admin record if exists
    let admin = null;
    if (orgMember.contactId) {
      admin = await prisma.admin.findFirst({
        where: { contactId: orgMember.contactId }
      });
    }
    
    // Return all hydrated data
    const hydrationData = {
      // NAVIGATION KEYS (source of truth for routing)
      contactId: orgMember.contactId,
      adminId: admin ? admin.id : null,
      orgId: orgMember.orgId,
      phone: orgMember.phone || orgMember.contact?.phone, // Check both sources
      
      // CRM DATA (for CRM operations)
      orgMember: {
        id: orgMember.id,  // Still needed for CRM operations!
        contactId: orgMember.contactId,
        orgId: orgMember.orgId,
        firstName: orgMember.firstName,
        lastName: orgMember.lastName,
        email: orgMember.email,
        phone: orgMember.phone,
        role: orgMember.role,
        firebaseId: orgMember.firebaseId,
        // Extended CRM fields
        goesBy: orgMember.goesBy,
        street: orgMember.street,
        city: orgMember.city,
        state: orgMember.state,
        zip: orgMember.zip,
        employer: orgMember.employer,
        yearsWithOrganization: orgMember.yearsWithOrganization,
        birthday: orgMember.birthday,
        married: orgMember.married,
        spouseName: orgMember.spouseName,
        numberOfKids: orgMember.numberOfKids,
        originStory: orgMember.originStory,
        notes: orgMember.notes,
        tags: orgMember.tags,
        categoryOfEngagement: orgMember.categoryOfEngagement
      },
      
      // Organization data
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      
      // Events data
      events: events.map(event => ({
        id: event.id,
        name: event.name,
        slug: event.slug
      })),
      
      // Team members (OrgMembers in this org)
      orgMembers: orgMembers.map(member => ({
        id: member.id,
        contactId: member.contactId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role
      })),
      
      // Admin data (NEW)
      admin: admin ? {
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive
      } : null
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
