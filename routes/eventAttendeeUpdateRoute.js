import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * PATCH /event-attendees/:attendeeId
 * 
 * Update EventAttendee fields (mapped from form data)
 */
router.patch('/:attendeeId', async (req, res) => {
  try {
    const { attendeeId } = req.params;
    const updateData = req.body;

    console.log('📝 Updating EventAttendee:', attendeeId, updateData);

    // Update the EventAttendee
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: updateData,
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
      }
    });

    console.log('✅ EventAttendee updated successfully');

    res.json(updatedAttendee);

  } catch (error) {
    console.error('❌ Error updating EventAttendee:', error);
    res.status(500).json({ error: 'Failed to update EventAttendee' });
  }
});

export default router;


