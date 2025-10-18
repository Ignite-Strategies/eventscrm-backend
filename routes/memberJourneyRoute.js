import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { 
  syncMemberJourney, 
  getPipelineCounts, 
  updateMemberStage 
} from '../services/memberJourneyService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/member-journey/pipeline?orgId=xxx&containerId=xxx
 * Get pipeline distribution for org
 */
router.get('/pipeline', async (req, res) => {
  try {
    const { orgId, containerId } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({ error: 'orgId and containerId required' });
    }
    
    const result = await getPipelineCounts(orgId, containerId);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error getting pipeline:', error);
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

/**
 * GET /api/member-journey?orgId=xxx&journeyStage=xxx
 * Get members at specific stage (or all)
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, journeyStage } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId required' });
    }
    
    const where = { orgId };
    if (journeyStage) {
      where.journeyStage = journeyStage;
    }
    
    const journeys = await prisma.memberJourney.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            attended: true,
            amountPaid: true
          }
        }
      },
      orderBy: {
        lastActivityAt: 'desc'
      }
    });
    
    res.json(journeys);
    
  } catch (error) {
    console.error('❌ Error getting journeys:', error);
    res.status(500).json({ error: 'Failed to get journeys' });
  }
});

/**
 * POST /api/member-journey/sync
 * Manually sync a contact's journey (recalculate from Contact fields)
 */
router.post('/sync', async (req, res) => {
  try {
    const { contactId, orgId } = req.body;
    
    if (!contactId || !orgId) {
      return res.status(400).json({ error: 'contactId and orgId required' });
    }
    
    const journey = await syncMemberJourney(contactId, orgId);
    res.json(journey);
    
  } catch (error) {
    console.error('❌ Error syncing journey:', error);
    res.status(500).json({ error: 'Failed to sync journey' });
  }
});

/**
 * PATCH /api/member-journey/:id
 * Manually update journey stage
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { journeyStage, notes } = req.body;
    
    if (!journeyStage) {
      return res.status(400).json({ error: 'journeyStage required' });
    }
    
    // Validate stage
    const validStages = ['UNAWARE', 'CURIOUS', 'ACTIVATED', 'ENGAGED', 'CHAMPION', 'ALUMNI'];
    if (!validStages.includes(journeyStage)) {
      return res.status(400).json({ error: 'Invalid journey stage' });
    }
    
    const journey = await updateMemberStage(id, journeyStage, notes);
    res.json(journey);
    
  } catch (error) {
    console.error('❌ Error updating journey:', error);
    res.status(500).json({ error: 'Failed to update journey' });
  }
});

/**
 * DELETE /api/member-journey/:id
 * Remove journey record
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.memberJourney.delete({
      where: { id }
    });
    
    console.log(`✅ Deleted member journey: ${id}`);
    res.json({ message: 'Journey deleted' });
    
  } catch (error) {
    console.error('❌ Error deleting journey:', error);
    res.status(500).json({ error: 'Failed to delete journey' });
  }
});

export default router;

