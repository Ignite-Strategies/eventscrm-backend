import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/welcome/:firebaseId
 * 
 * SIMPLE WELCOME HYDRATION - Returns ONLY the core management IDs:
 * 1. contactId (universal person record)
 * 2. orgMemberId (CRM management record)
 * 3. adminId (if exists)
 */
router.get('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    console.log('🚀 WELCOME HYDRATION for firebaseId:', firebaseId);

    // Find OrgMember by firebaseId
    const orgMember = await prisma.orgMember.findFirst({
      where: { firebaseId },
      include: {
        contact: true,
        org: {
          include: {
            events: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Get most recent event
            }
          }
        }
      }
    });

    if (!orgMember) {
      console.log('❌ No orgMember found for firebaseId:', firebaseId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Find Admin by firebaseId
    const admin = await prisma.admin.findFirst({
      where: { firebaseId }
    });

    // SIMPLE RESPONSE - Only the 3 things Welcome needs
    const welcomeData = {
      adminId: admin ? admin.id : null,
      orgId: orgMember.orgId,
      eventId: orgMember.org?.events?.[0]?.id || null, // First event or null
      orgName: orgMember.org?.name || 'Unknown',
      memberName: orgMember.firstName || 'there'
    };

    console.log('✅ Welcome hydration complete:', welcomeData);
    res.json(welcomeData);

  } catch (error) {
    console.error('❌ Welcome hydration error:', error);
    res.status(500).json({ error: 'Hydration failed' });
  }
});

export default router;
