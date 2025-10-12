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
    
    // Get admin record by firebaseId (Admin is source of truth!)
    const admin = await prisma.admin.findFirst({
      where: { 
        firebaseId: firebaseId,
        isActive: true
      },
      include: {
        org: true,
        event: true
      }
    });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found for this Firebase user' });
    }
    
    console.log('🔍 Hydration Debug:', {
      firebaseId,
      adminId: admin.id,
      orgId: admin.orgId,
      eventId: admin.eventId,
      role: admin.role
    });
    
    // Return the 3 core IDs from Admin + admin object
    const hydrationData = {
      adminId: admin.id,
      orgId: admin.orgId,
      eventId: admin.eventId,
      admin: {
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
        orgId: admin.orgId,
        eventId: admin.eventId
      }
    };
    
    console.log('✅ Hydration complete:', hydrationData);
    
    res.json(hydrationData);
    
  } catch (error) {
    console.error('❌ Hydration error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
