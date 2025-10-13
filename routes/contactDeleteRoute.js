import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * DELETE /contacts/:contactId
 * 
 * Delete a Contact (cascades to EventAttendee, OrgMember, Admin)
 */
router.delete('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    console.log('🗑️ DELETE CONTACT REQUEST:', contactId);
    console.log('🗑️ REQUEST URL:', req.url);
    console.log('🗑️ REQUEST METHOD:', req.method);

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        eventAttendees: true,
        orgMember: true,
        admin: true
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    console.log(`📊 Contact has ${contact.eventAttendees.length} event attendee records`);
    console.log(`📊 Contact has OrgMember: ${!!contact.orgMember}`);
    console.log(`📊 Contact has Admin: ${!!contact.admin}`);

    // Delete contact (cascade will handle related records)
    await prisma.contact.delete({
      where: { id: contactId }
    });

    console.log('✅ Contact deleted successfully (with cascades)');

    res.json({ 
      success: true, 
      message: 'Contact deleted successfully',
      deletedContact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email
      }
    });

  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;

