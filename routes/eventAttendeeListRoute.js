import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Get all attendees for an event (PRISMA)
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType } = req.query;
    
    const where = { eventId };
    if (audienceType) where.audienceType = audienceType;
    
    const attendees = await prisma.eventAttendee.findMany({
      where,
      include: {
        contact: true  // Include contact details
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(attendees);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single attendee (PRISMA)
router.get('/attendees/:attendeeId', async (req, res) => {
  try {
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: req.params.attendeeId },
      include: {
        contact: true  // Include contact details
      }
    });
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }
    
    res.json(attendee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update attendee (PRISMA)
router.patch('/attendees/:attendeeId', async (req, res) => {
  try {
    const attendee = await prisma.eventAttendee.update({
      where: { id: req.params.attendeeId },
      data: req.body
    });
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }
    
    res.json(attendee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

