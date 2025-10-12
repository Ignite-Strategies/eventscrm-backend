import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/:eventId/attendees
 * 
 * Returns ALL EventAttendees with Contact data in one clean query
 */
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('🔍 Loading EventAttendees + Contact data for event:', eventId);

    // CLEAN SQL query that joins EventAttendee + Contact in one result
    const result = await prisma.$queryRaw`
      SELECT 
        ea.id as "attendeeId",
        ea."eventId",
        ea."contactId",
        ea."currentStage",
        ea."audienceType",
        ea."attended",
        ea."createdAt",
        c.id as "contactId",
        c."firstName",
        c."lastName", 
        c.email,
        c.phone,
        c."orgId" as "contactOrgId"
      FROM "EventAttendee" ea
      LEFT JOIN "Contact" c ON ea."contactId" = c.id
      WHERE ea."eventId" = ${eventId}
      ORDER BY ea."createdAt" DESC
    `;

    console.log(`✅ Found ${result.length} EventAttendees with Contact data`);
    console.log('🔍 Combined data:', JSON.stringify(result, null, 2));

    res.json(result);

  } catch (error) {
    console.error('❌ Error loading EventAttendees:', error);
    res.status(500).json({ error: 'Failed to load EventAttendees' });
  }
});

export default router;
