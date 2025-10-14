import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/welcome/:firebaseId
 * 
 * ADMIN-FIRST HYDRATION - Just check if user exists as Admin
 * Admins don't need orgMember - they're self-sufficient!
 */
router.get('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    console.log('🚀 WELCOME HYDRATION for firebaseId:', firebaseId);

    // Check for Admin - that's all we need!
    const admin = await prisma.admin.findFirst({
      where: { firebaseId }
    });

    if (!admin) {
      console.log('❌ No admin found for firebaseId:', firebaseId);
      return res.status(404).json({ error: 'Admin not found - please contact support' });
    }

    console.log('✅ Admin found:', admin.id);

    // Return ONLY the 3 IDs - that's it!
    const welcomeData = {
      adminId: admin.id,
      orgId: admin.orgId || null,
      eventId: admin.eventId || null
    };

    console.log('✅ Admin hydration complete:', welcomeData);
    res.json(welcomeData);

  } catch (error) {
    console.error('❌ Welcome hydration error:', error);
    res.status(500).json({ error: 'Hydration failed' });
  }
});

export default router;
