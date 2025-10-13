import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/:eventId/form-submissions
 * 
 * Fetches all form responses for a specific event
 * Query params:
 *   - publicFormId: Filter by specific form (optional)
 * 
 * Returns:
 *   - Array of attendees with their form responses (parsed from notes JSON)
 */
router.get('/events/:eventId/form-submissions', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { publicFormId } = req.query;

    console.log('📋 Fetching form responses for event:', eventId, 'publicFormId:', publicFormId);

    // Build where clause
    const whereClause = {
      eventId: eventId,
      submittedFormId: publicFormId || undefined, // Filter by form if provided
      notes: {
        not: null // Only get attendees with form responses
      }
    };

    // Fetch attendees with form responses
    const attendees = await prisma.eventAttendee.findMany({
      where: whereClause,
      include: {
        contact: true, // Include contact details
        submittedForm: true // Include form details
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse form responses from notes JSON
    const formResponses = attendees.map(attendee => {
      let parsedResponses = {};
      try {
        if (attendee.notes) {
          parsedResponses = JSON.parse(attendee.notes);
        }
      } catch (parseError) {
        console.error('❌ Error parsing notes for attendee:', attendee.id, parseError);
      }

      return {
        attendeeId: attendee.id,
        contactId: attendee.contactId,
        contactName: `${attendee.contact?.firstName || ''} ${attendee.contact?.lastName || ''}`.trim(),
        email: attendee.contact?.email,
        phone: attendee.contact?.phone,
        audienceType: attendee.audienceType,
        currentStage: attendee.currentStage,
        submittedFormId: attendee.submittedFormId,
        formName: attendee.submittedForm?.title || 'Unknown Form',
        formSlug: attendee.submittedForm?.slug,
        formResponses: parsedResponses, // Custom field responses
        submittedAt: attendee.createdAt,
        updatedAt: attendee.updatedAt
      };
    });

    console.log('✅ Found', formResponses.length, 'form responses');

    res.json(formResponses);

  } catch (error) {
    console.error('❌ Error fetching form responses:', error);
    res.status(500).json({ error: 'Failed to fetch form responses' });
  }
});

/**
 * GET /attendees/:attendeeId/form-response
 * 
 * Fetches form response for a specific attendee
 * 
 * Returns:
 *   - Single attendee with their form response (parsed from notes JSON)
 */
router.get('/attendees/:attendeeId/form-response', async (req, res) => {
  try {
    const { attendeeId } = req.params;

    console.log('📋 Fetching form response for attendee:', attendeeId);

    // Fetch attendee with form response
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: attendeeId },
      include: {
        contact: true, // Include contact details
        submittedForm: true // Include form details
      }
    });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    if (!attendee.notes) {
      return res.status(404).json({ error: 'No form response found for this attendee' });
    }

    // Parse form responses from notes JSON
    let parsedResponses = {};
    try {
      parsedResponses = JSON.parse(attendee.notes);
    } catch (parseError) {
      console.error('❌ Error parsing notes for attendee:', attendee.id, parseError);
      return res.status(500).json({ error: 'Failed to parse form response' });
    }

    const formResponse = {
      attendeeId: attendee.id,
      contactId: attendee.contactId,
      contactName: `${attendee.contact?.firstName || ''} ${attendee.contact?.lastName || ''}`.trim(),
      email: attendee.contact?.email,
      phone: attendee.contact?.phone,
      audienceType: attendee.audienceType,
      currentStage: attendee.currentStage,
      submittedFormId: attendee.submittedFormId,
      formName: attendee.submittedForm?.title || 'Unknown Form',
      formSlug: attendee.submittedForm?.slug,
      formResponses: parsedResponses, // Custom field responses
      submittedAt: attendee.createdAt,
      updatedAt: attendee.updatedAt
    };

    console.log('✅ Found form response for attendee');

    res.json(formResponse);

  } catch (error) {
    console.error('❌ Error fetching form response:', error);
    res.status(500).json({ error: 'Failed to fetch form response' });
  }
});

export default router;

