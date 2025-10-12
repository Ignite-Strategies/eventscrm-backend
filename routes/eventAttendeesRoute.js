import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/:eventId/attendees
 * 
 * Returns ALL EventAttendees for a specific event (no audienceType filter)
 */
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('🔍 Loading ALL EventAttendees for event:', eventId);

    // Get all EventAttendees for this event (no filters)
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId
      }
    });

    console.log(`✅ Found ${attendees.length} EventAttendees for event: ${eventId}`);
    console.log('🔍 EventAttendees data:', JSON.stringify(attendees, null, 2));

    res.json(attendees);

  } catch (error) {
    console.error('❌ Error loading EventAttendees:', error);
    res.status(500).json({ error: 'Failed to load EventAttendees' });
  }
});

export default router;
