import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /contacts/:contactId
 * 
 * Get Contact with OrgMember data (if exists)
 */
router.get('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    console.log('👤 Fetching contact:', contactId);

    // Get Contact with OrgMember relation
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        orgMember: true // Include OrgMember if exists
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    console.log('✅ Contact found, has OrgMember:', !!contact.orgMember);

    // Return Contact + OrgMember data merged
    const response = {
      id: contact.id,
      contactId: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      orgId: contact.orgId,
      hasOrgMember: !!contact.orgMember,
      // OrgMember extended data (if exists)
      ...(contact.orgMember && {
        orgMemberId: contact.orgMember.id,
        goesBy: contact.orgMember.goesBy,
        street: contact.orgMember.street,
        city: contact.orgMember.city,
        state: contact.orgMember.state,
        zip: contact.orgMember.zip,
        employer: contact.orgMember.employer,
        yearsWithOrganization: contact.orgMember.yearsWithOrganization,
        birthday: contact.orgMember.birthday,
        married: contact.orgMember.married,
        spouseName: contact.orgMember.spouseName,
        numberOfKids: contact.orgMember.numberOfKids,
        originStory: contact.orgMember.originStory,
        notes: contact.orgMember.notes,
        categoryOfEngagement: contact.orgMember.categoryOfEngagement,
        tags: contact.orgMember.tags
      })
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

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
    const formattedEvents = eventAttendees.map(ea => {
      // Parse submission data from notes field
      let submissionData = {};
      if (ea.notes) {
        try {
          submissionData = JSON.parse(ea.notes);
        } catch (e) {
          console.log('⚠️ Could not parse submission notes for attendee:', ea.id);
        }
      }

      return {
        eventId: ea.eventId,
        eventName: ea.event.name,
        eventDate: ea.event.date,
        currentStage: ea.currentStage,
        audienceType: ea.audienceType,
        attended: ea.attended,
        amountPaid: ea.amountPaid,
        ticketType: ea.ticketType,
        addedAt: ea.createdAt,
        submissionData // What they submitted on the form (custom fields)
      };
    });

    res.json(formattedEvents);

  } catch (error) {
    console.error('❌ Error fetching contact events:', error);
    res.status(500).json({ error: 'Failed to fetch contact events' });
  }
});

export default router;

