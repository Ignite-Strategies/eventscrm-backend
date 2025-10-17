import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * LIST HYDRATION - Load lists + campaigns in one call
 * GET /api/list-hydration?orgId=xxx
 * 
 * Super simple, super clean!
 */
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    // Load lists and campaigns in parallel
    const [lists, campaigns] = await Promise.all([
      prisma.contactList.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.campaign.findMany({
        where: { orgId },
        include: {
          contactList: {
            select: {
              id: true,
              name: true,
              totalContacts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      lists,
      campaigns
    });
    
  } catch (error) {
    console.error('❌ List hydration error:', error);
    res.status(500).json({ error: 'Failed to load lists and campaigns' });
  }
});

export default router;


