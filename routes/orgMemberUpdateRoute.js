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
    
    // Don't allow updating these fields directly
    delete updates.id;
    delete updates.contactId;
    delete updates.orgId;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    // Handle engagement value - convert value to engagementId
    if (updates.engagementValue !== undefined) {
      const engagement = await prisma.engagement.findUnique({
        where: { value: parseInt(updates.engagementValue) }
      });
      
      if (engagement) {
        updates.engagementId = engagement.id;
      }
      delete updates.engagementValue;
    }
    
    // Update the org member
    const updatedMember = await prisma.orgMember.update({
      where: { id: orgMemberId },
      data: updates,
      include: {
        contact: true,
        engagement: true
      }
    });
    
    console.log('✅ ORG MEMBER UPDATED:', updatedMember.id);
    
    res.json({
      success: true,
      member: updatedMember
    });
    
  } catch (error) {
    console.error('❌ ORG MEMBER UPDATE ERROR:', error);
    res.status(500).json({ error: 'Failed to update org member: ' + error.message });
  }
});

export default router;

