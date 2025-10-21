import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/google-auth-hydrator/:adminId
 * 
 * 🔍 GOOGLE AUTH CHECKER & HYDRATOR
 * 
 * Purpose:
 * - Takes adminId from localStorage (the personhood key)
 * - Returns ALL Google OAuth connections for that admin
 * - Frontend uses this to hydrate integration status on settings page
 * 
 * Returns:
 * {
 *   adminId: 'admin_xxx',
 *   connections: {
 *     gmail: { connected: true, email: 'adam@example.com', connectionId: 'xxx', ... },
 *     youtube: { connected: false },
 *     ads: { connected: false }
 *   }
 * }
 */
router.get('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    
    if (!adminId) {
      return res.status(400).json({ error: 'adminId is required' });
    }
    
    console.log('🔍 GOOGLE AUTH HYDRATOR: Checking connections for adminId:', adminId);
    
    // Fetch ALL active Google OAuth connections for this admin
    const connections = await prisma.googleOAuthConnection.findMany({
      where: {
        adminId: adminId,
        status: 'active'
      }
    });
    
    console.log(`✅ Found ${connections.length} active Google connections for admin ${adminId}`);
    
    // Build response object by service
    const response = {
      adminId: adminId,
      connections: {
        gmail: buildServiceStatus(connections, 'gmail'),
        youtube: buildServiceStatus(connections, 'youtube'),
        ads: buildServiceStatus(connections, 'ads')
      }
    };
    
    console.log('✅ GOOGLE AUTH HYDRATOR complete:', {
      gmail: response.connections.gmail.connected,
      youtube: response.connections.youtube.connected,
      ads: response.connections.ads.connected
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Google Auth Hydrator error:', error);
    res.status(500).json({ error: 'Failed to check Google OAuth connections' });
  }
});

/**
 * Helper: Build status object for a specific service
 */
function buildServiceStatus(connections, service) {
  const connection = connections.find(c => c.service === service);
  
  if (!connection) {
    return {
      connected: false,
      service: service
    };
  }
  
  return {
    connected: true,
    service: service,
    connectionId: connection.id,
    email: connection.email,
    status: connection.status,
    connectedAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    // Service-specific fields (only include if present)
    ...(connection.channelId && { channelId: connection.channelId }),
    ...(connection.channelName && { channelName: connection.channelName }),
    ...(connection.customerId && { customerId: connection.customerId }),
    ...(connection.accountName && { accountName: connection.accountName }),
    ...(connection.developerToken && { developerToken: connection.developerToken })
  };
}

export default router;

