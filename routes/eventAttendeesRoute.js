import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/attendees?formId=xxx
 * 
 * Returns EventAttendees filtered by formId
 */
router.get('/attendees', async (req, res) => {
  try {
    const { formId } = req.query;

    if (!formId) {
      return res.status(400).json({ error: 'formId is required' });
    }

    console.log('🔍 Loading EventAttendees for formId:', formId);

    const attendees = await prisma.eventAttendee.findMany({
      where: { submittedFormId: formId },
      include: {
        contact: {
          include: {
            orgMember: {
              select: {
                id: true,
                orgId: true
              }
            }
          }
        },
        likelihoodToAttend: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const result = attendees.map(attendee => ({
      ...attendee,
      orgMemberId: attendee.contact?.orgMember?.id || null
    }));

    console.log(`✅ Found ${result.length} EventAttendees for form ${formId}`);

    res.json(result);

  } catch (error) {
    console.error('❌ Error loading EventAttendees by formId:', error);
    res.status(500).json({ error: 'Failed to load EventAttendees' });
  }
});

/**
 * GET /events/:eventId/attendees
 * 
 * Returns ALL EventAttendees with Contact data in one clean query
 */
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('🔍 Loading EventAttendees + Contact data for event:', eventId);

    // Use Prisma query to get nested structure
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        contact: {
          include: {
            orgMember: {
              select: {
                id: true,
                orgId: true
              }
            }
          }
        },
        likelihoodToAttend: true  // Include the reference table data
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to include orgMemberId at top level for easy frontend access
    const result = attendees.map(attendee => ({
      ...attendee,
      orgMemberId: attendee.contact?.orgMember?.id || null
    }));

    console.log(`✅ Found ${result.length} EventAttendees with Contact data`);

    res.json(result);

  } catch (error) {
    console.error('❌ Error loading EventAttendees:', error);
    res.status(500).json({ error: 'Failed to load EventAttendees' });
  }
});

export default router;
