import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/welcome/:firebaseId
 * 
 * 🔥 UNIVERSAL HYDRATOR - Returns FULL objects, not just IDs!
 * Frontend caches these to localStorage for all pages to use
 */
router.get('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    console.log('🚀 UNIVERSAL HYDRATION for firebaseId:', firebaseId);

    // Load Admin with org and event relations
    const admin = await prisma.admin.findFirst({
      where: { firebaseId },
      include: {
        org: true,
        event: true
      }
    });

    if (!admin) {
      console.log('❌ No admin found for firebaseId:', firebaseId);
      return res.status(404).json({ error: 'Admin not found - please contact support' });
    }

    console.log('✅ Admin found:', admin.id);

    // Return FULL objects + IDs for backwards compatibility
    const welcomeData = {
      // IDs (for backwards compatibility)
      adminId: admin.id,
      orgId: admin.orgId || null,
      eventId: admin.eventId || null,
      
      // FULL OBJECTS (for caching)
      admin: {
        id: admin.id,
        firebaseId: admin.firebaseId,
        email: admin.email,
        name: admin.name
      },
      org: admin.org ? {
        id: admin.org.id,
        name: admin.org.name,
        slug: admin.org.slug,
        mission: admin.org.mission,
        website: admin.org.website
      } : null,
      event: admin.event ? {
        id: admin.event.id,
        name: admin.event.name,
        slug: admin.event.slug,
        date: admin.event.date,
        time: admin.event.time,
        description: admin.event.description
      } : null,
      
      // Legacy fields for display
      orgName: admin.org?.name || null,
      memberName: admin.name || null
    };

    console.log('✅ UNIVERSAL HYDRATION complete:', {
      adminId: welcomeData.adminId,
      orgName: welcomeData.org?.name,
      eventName: welcomeData.event?.name
    });
    
    res.json(welcomeData);

  } catch (error) {
    console.error('❌ Welcome hydration error:', error);
    res.status(500).json({ error: 'Hydration failed' });
  }
});

export default router;
