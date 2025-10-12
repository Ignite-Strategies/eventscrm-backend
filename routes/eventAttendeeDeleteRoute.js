import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * DELETE /api/event-attendees/:id
 * 
 * Delete an EventAttendee record (does NOT delete the Contact)
 * This is fork-aware - only removes the event relationship
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting EventAttendee:', id);

    // Check if EventAttendee exists
    const eventAttendee = await prisma.eventAttendee.findUnique({
      where: { id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!eventAttendee) {
      return res.status(404).json({ error: 'EventAttendee not found' });
    }

    // Delete EventAttendee (Contact remains untouched)
    await prisma.eventAttendee.delete({
      where: { id }
    });

    console.log('✅ EventAttendee deleted successfully (Contact preserved)');

    res.json({ 
      success: true, 
      message: 'EventAttendee deleted successfully',
      deletedEventAttendee: {
        id: eventAttendee.id,
        contactName: `${eventAttendee.contact.firstName} ${eventAttendee.contact.lastName}`,
        contactEmail: eventAttendee.contact.email,
        audienceType: eventAttendee.audienceType,
        currentStage: eventAttendee.currentStage
      }
    });

  } catch (error) {
    console.error('❌ Error deleting EventAttendee:', error);
    res.status(500).json({ error: 'Failed to delete EventAttendee' });
  }
});

export default router;
