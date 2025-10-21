import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/welcome/:firebaseId
 * 
 * 🛡️ ADMIN RETURN GATEKEEPER
 * Called when user returns to app (Splash → Welcome)
 * 
 * Purpose:
 * 1. Find Admin by firebaseId
 * 2. Return full Admin/Org/Event objects
 * 3. Frontend uses this to determine routing (containerId? orgId? firstName?)
 */
router.get('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    console.log('🛡️ GATEKEEPER: Checking Admin for firebaseId:', firebaseId);

    // Load Admin with org and event relations
    const admin = await prisma.admin.findFirst({
      where: { firebaseId },
      include: {
        org: true,
        event: true
      }
    });

    if (!admin) {
      console.log('❌ GATEKEEPER: No admin found for firebaseId:', firebaseId);
      return res.status(404).json({ error: 'Admin not found - please contact support' });
    }

    console.log('✅ GATEKEEPER: Admin found:', admin.id);

    // Fetch Google OAuth connections for this admin/org
    const googleOAuthConnections = await prisma.googleOAuthConnection.findMany({
      where: {
        orgId: admin.orgId,
        adminId: admin.id,
        status: 'active'
      }
    });

    // Extract connection IDs by service
    const gmailConnectionId = googleOAuthConnections.find(c => c.service === 'gmail')?.id || null;
    const youtubeConnectionId = googleOAuthConnections.find(c => c.service === 'youtube')?.id || null;
    const googleAdsConnectionId = googleOAuthConnections.find(c => c.service === 'ads')?.id || null;

    console.log('🔍 GATEKEEPER: Found Google OAuth connections:', {
      gmail: gmailConnectionId,
      youtube: youtubeConnectionId,
      googleAds: googleAdsConnectionId
    });

    // Return FULL objects + IDs for backwards compatibility
    const gatekeeperData = {
      // IDs (for backwards compatibility)
      adminId: admin.id,
      orgId: admin.orgId || null,
      eventId: admin.eventId || null,
      containerId: admin.containerId || null,
      
      // Google OAuth Connection IDs
      gmailConnectionId,
      youtubeConnectionId,
      googleAdsConnectionId,
      
      // FULL OBJECTS (for caching)
      admin: {
        id: admin.id,
        firebaseId: admin.firebaseId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        photoURL: admin.photoURL,
        containerId: admin.containerId,
        role: admin.role,
        status: admin.status
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
      memberName: admin.firstName || admin.email?.split('@')[0] || null
    };

    console.log('✅ GATEKEEPER complete:', {
      adminId: gatekeeperData.adminId,
      containerId: gatekeeperData.containerId,
      orgId: gatekeeperData.orgId,
      hasProfile: !!admin.firstName
    });
    
    res.json(gatekeeperData);

  } catch (error) {
    console.error('❌ Gatekeeper error:', error);
    res.status(500).json({ error: 'Gatekeeper check failed' });
  }
});

export default router;

