import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * Universal Hydration Route
 * Returns all data needed for the dashboard in one call
 */
router.get('/:orgMemberId', async (req, res) => {
  try {
    const { orgMemberId } = req.params;
    
    console.log('🚀 UNIVERSAL HYDRATION for orgMemberId:', orgMemberId);
    
    // Get OrgMember with all relations
    const orgMember = await prisma.orgMember.findUnique({
      where: { id: orgMemberId },
      include: {
        contact: true,
        org: true
      }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'OrgMember not found' });
    }
    
    // Get organization data
    const org = orgMember.org;
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Get events for the org
    const events = await prisma.event.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get supporters for the org
    const supporters = await prisma.orgMember.findMany({
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
      orgMember: {
        id: orgMember.id,
        contactId: orgMember.contactId,
        orgId: orgMember.orgId,
        firstName: orgMember.firstName,
        lastName: orgMember.lastName,
        email: orgMember.email,
        phone: orgMember.phone
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      events: events.map(event => ({
        id: event.id,
        name: event.name,
        slug: event.slug
      })),
      supporters: supporters.map(supporter => ({
        id: supporter.id,
        contactId: supporter.contactId,
        firstName: supporter.firstName,
        lastName: supporter.lastName,
        email: supporter.email
      })),
      admin: admin ? {
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions
      } : null
    };
    
    console.log('✅ Hydration complete:', {
      orgMember: orgMember.id,
      org: org.name,
      events: events.length,
      supporters: supporters.length,
      admin: admin ? admin.id : 'none'
    });
    
    res.json(hydrationData);
    
  } catch (error) {
    console.error('❌ Hydration error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
