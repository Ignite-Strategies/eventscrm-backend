import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// PATCH /orgmembers/:orgMemberId - Update individual org member fields
router.patch('/orgmembers/:orgMemberId', async (req, res) => {
  try {
    const { orgMemberId } = req.params;
    const updates = req.body;
    
    console.log('📝 ORG MEMBER UPDATE: Updating member:', orgMemberId);
    console.log('📝 Updates:', updates);
    
    // Get the OrgMember to find the contactId
    const orgMember = await prisma.orgMember.findUnique({
      where: { id: orgMemberId },
      include: { contact: true }
    });
    
    if (!orgMember) {
      return res.status(404).json({ error: 'Org member not found' });
    }
    
    // Separate Contact fields from OrgMember fields
    const contactFields = ['firstName', 'lastName', 'email', 'phone', 'goesBy', 'employer', 'street', 'city', 'state', 'zip', 'birthday', 'married', 'spouseName', 'numberOfKids'];
    const contactUpdates = {};
    const orgMemberUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (contactFields.includes(key)) {
        contactUpdates[key] = updates[key];
      } else if (!['id', 'contactId', 'orgId', 'createdAt', 'updatedAt'].includes(key)) {
        orgMemberUpdates[key] = updates[key];
      }
    });
    
    // Update Contact if there are Contact fields
    if (Object.keys(contactUpdates).length > 0 && orgMember.contactId) {
      console.log('📝 Updating Contact fields:', contactUpdates);
      await prisma.contact.update({
        where: { id: orgMember.contactId },
        data: contactUpdates
      });
    }
    
    // Handle engagement value - convert to engagementId
    if (orgMemberUpdates.engagementValue !== undefined) {
      const value = parseInt(orgMemberUpdates.engagementValue);
      
      // Validate value
      if (![1, 2, 3, 4].includes(value)) {
        return res.status(400).json({ 
          error: 'engagementValue must be 1 (undetermined), 2 (low), 3 (medium), or 4 (high)' 
        });
      }
      
      // Find the Engagement record with this value
      const engagement = await prisma.engagement.findUnique({
        where: { value }
      });
      
      if (engagement) {
        orgMemberUpdates.engagementId = engagement.id;  // Store the ID
      }
      
      delete orgMemberUpdates.engagementValue;  // Don't update engagementValue directly
    }
    
    // Update the OrgMember if there are OrgMember fields
    let updatedMember = orgMember;
    if (Object.keys(orgMemberUpdates).length > 0) {
      console.log('📝 Updating OrgMember fields:', orgMemberUpdates);
      updatedMember = await prisma.orgMember.update({
        where: { id: orgMemberId },
        data: orgMemberUpdates,
        include: {
          contact: true,
          engagement: true  // Include to return the value
        }
      });
    } else {
      // Reload to get updated Contact data
      updatedMember = await prisma.orgMember.findUnique({
        where: { id: orgMemberId },
        include: {
          contact: true,
          engagement: true
        }
      });
    }
    
    console.log('✅ ORG MEMBER UPDATED:', updatedMember.id);
    
    // Transform response to match hydration format
    const member = {
      id: updatedMember.id,
      orgMemberId: updatedMember.id,
      contactId: updatedMember.contactId,
      orgId: updatedMember.orgId,
      
      // Contact data
      firstName: updatedMember.contact?.firstName || '',
      lastName: updatedMember.contact?.lastName || '',
      email: updatedMember.contact?.email || '',
      phone: updatedMember.contact?.phone || '',
      goesBy: updatedMember.contact?.goesBy,
      employer: updatedMember.contact?.employer,
      
      // OrgMember data
      yearsWithOrganization: updatedMember.yearsWithOrganization,
      leadershipRole: updatedMember.leadershipRole,
      originStory: updatedMember.originStory,
      notes: updatedMember.notes,
      engagementValue: updatedMember.engagement?.value || null,
      tags: updatedMember.tags,
      
      createdAt: updatedMember.createdAt,
      updatedAt: updatedMember.updatedAt
    };
    
    res.json({
      success: true,
      member
    });
    
  } catch (error) {
    console.error('❌ ORG MEMBER UPDATE ERROR:', error);
    res.status(500).json({ error: 'Failed to update org member: ' + error.message });
  }
});

export default router;

