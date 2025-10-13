import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /org-members
 * 
 * Creates an OrgMember record from an existing Contact
 * This is used to elevate a Contact to OrgMember status
 */
router.post('/org-members', async (req, res) => {
  try {
    const { contactId, orgId } = req.body;

    console.log('⬆️ ELEVATE TO ORG MEMBER: contactId:', contactId, 'orgId:', orgId);

    if (!contactId || !orgId) {
      return res.status(400).json({ error: 'contactId and orgId are required' });
    }

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if already an org member
    const existingOrgMember = await prisma.orgMember.findFirst({
      where: {
        contactId: contactId,
        orgId: orgId
      }
    });

    if (existingOrgMember) {
      return res.status(400).json({ error: 'Contact is already an org member' });
    }

    // Create OrgMember record - ContactId => OrgMemberId
    const orgMember = await prisma.orgMember.create({
      data: {
        contactId: contactId,  // Link to existing Contact
        orgId: orgId,          // Link to Organization (from localStorage)
        // Only org-specific fields, no universal personhood data
        yearsWithOrganization: 0,  // Default: new to org
        // No married, birthday, etc. - those are in Contact now
      }
    });

    console.log('✅ Created OrgMember:', orgMember.id);

    res.json({
      success: true,
      orgMember: {
        id: orgMember.id,                    // New OrgMemberId
        contactId: orgMember.contactId,       // Link back to Contact
        orgId: orgMember.orgId,              // Link to Organization
        yearsWithOrganization: orgMember.yearsWithOrganization
      }
    });

  } catch (error) {
    console.error('❌ Error creating OrgMember:', error);
    res.status(500).json({ error: 'Failed to create org member' });
  }
});

export default router;
