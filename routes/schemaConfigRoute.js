import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/schema/event-attendee
 * Returns dynamic schema config based on actual EventAttendee data
 * NO MORE HARDCODED STAGES!
 */
router.get('/event-attendee', async (req, res) => {
  try {
    // Get audience types from actual EventAttendee data
    const audienceTypes = await prisma.eventAttendee.findMany({
      select: { audienceType: true },
      distinct: ['audienceType']
    });
    
    // Get stages from actual EventAttendee data
    const stages = await prisma.eventAttendee.findMany({
      select: { currentStage: true },
      distinct: ['currentStage']
    });
    
    res.json({
      audienceTypes: audienceTypes.map(a => a.audienceType),
      stages: stages.map(s => s.currentStage)
    });
  } catch (error) {
    console.error('Error fetching dynamic schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

/**
 * GET /api/schema/audience-stages/:audienceType
 * Returns stages for a specific audience type from actual data
 */
router.get('/audience-stages/:audienceType', async (req, res) => {
  try {
    const { audienceType } = req.params;
    
    // Get stages for this specific audience type from actual data
    const stages = await prisma.eventAttendee.findMany({
      where: { audienceType },
      select: { currentStage: true },
      distinct: ['currentStage']
    });
    
    res.json({ 
      success: true, 
      audienceType,
      stages: stages.map(s => s.currentStage)
    });
  } catch (error) {
    console.error('Error fetching audience stages:', error);
    res.status(500).json({ error: 'Failed to fetch audience stages' });
  }
});

export default router;