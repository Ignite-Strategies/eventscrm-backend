import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /contacts/:contactId/events
 * 
 * Get all EventAttendees for a specific contact (which events they're in, what stage)
 */
router.get('/:contactId/events', async (req, res) => {
  try {
    const { contactId } = req.params;

    console.log('📅 Fetching events for contact:', contactId);

    // Get all EventAttendees for this contact
    const eventAttendees = await prisma.eventAttendee.findMany({
      where: { contactId },
      include: {
        event: true // Include event details
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${eventAttendees.length} events for contact`);

    // Format for frontend
    const formattedEvents = eventAttendees.map(ea => ({
      eventId: ea.eventId,
      eventName: ea.event.name,
      eventDate: ea.event.date,
      currentStage: ea.currentStage,
      audienceType: ea.audienceType,
      attended: ea.attended,
      amountPaid: ea.amountPaid,
      ticketType: ea.ticketType,
      addedAt: ea.createdAt
    }));

    res.json(formattedEvents);

  } catch (error) {
    console.error('❌ Error fetching contact events:', error);
    res.status(500).json({ error: 'Failed to fetch contact events' });
  }
});

export default router;

