import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * UNIVERSAL HYDRATION - Load EVERYTHING at once
 * GET /api/universal-hydration?orgId=xxx
 * 
 * Returns ALL contacts with their IDs and relationships:
 * - contactId (universal ID)
 * - orgMemberId (if they're an org member)
 * - eventAttendeeIds (array of all events they've attended)
 * 
 * Frontend can then filter/group as needed!
 */
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query;
    console.log('🌊 UNIVERSAL HYDRATION: Loading everything for orgId:', orgId);

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    // Get ALL contacts for this org with ALL their relationships
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          // Direct org members (SINGULAR - orgMember not orgMembers!)
          { orgMember: { orgId } },
          // Event attendees from org's events
          { eventAttendees: { some: { event: { orgId } } } }
        ]
      },
      include: {
        // Include org member relationship (SINGULAR - orgMember not orgMembers!)
        // ONLY select fields that actually exist in OrgMember schema!
        orgMember: {
          select: {
            id: true,
            orgId: true,
            contactId: true,
            yearsWithOrganization: true,
            leadershipRole: true,
            originStory: true,
            notes: true,
            role: true,
            firebaseId: true,
            photoURL: true,
            tags: true,
            engagementId: true,
            createdAt: true,
            updatedAt: true
          },
          include: {
            engagement: true  // Include engagement to get the VALUE
          }
        },
        // Include ALL event attendee relationships
        eventAttendees: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                status: true,
                orgId: true
              }
            }
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Transform to universal format
    const universalContacts = contacts.map(contact => ({
      // Universal identifiers
      contactId: contact.id,
      orgMemberId: contact.orgMember?.id || null,
      eventAttendeeIds: contact.eventAttendees.map(ea => ea.id),
      
      // Basic contact info
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      goesBy: contact.goesBy,
      
      // Org member data (if they're a member)
      orgMember: contact.orgMember || null,
      isOrgMember: !!contact.orgMember,
      engagementValue: contact.orgMember?.engagement?.value || null,  // Hydrate engagement value!
      
      // Event attendee data (all events they've attended)
      eventAttendees: contact.eventAttendees.map(ea => ({
        id: ea.id,
        eventId: ea.eventId,
        eventName: ea.event.name,
        eventDate: ea.event.date,
        eventStatus: ea.event.status,
        audienceType: ea.audienceType,
        currentStage: ea.currentStage,
        attendedAt: ea.createdAt
      })),
      
      // Computed fields
      totalEventsAttended: contact.eventAttendees.length,
      upcomingEvents: contact.eventAttendees.filter(ea => ea.event.status === 'upcoming').length,
      paidEvents: contact.eventAttendees.filter(ea => ea.currentStage === 'paid').length,
      
      // Metadata
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }));

    // Get summary stats
    const stats = {
      totalContacts: universalContacts.length,
      orgMembers: universalContacts.filter(c => c.isOrgMember).length,
      eventAttendees: universalContacts.filter(c => c.totalEventsAttended > 0).length,
      paidAttendees: universalContacts.filter(c => c.paidEvents > 0).length,
      upcomingEventAttendees: universalContacts.filter(c => c.upcomingEvents > 0).length
    };

    console.log(`🌊 UNIVERSAL HYDRATION COMPLETE:`, stats);

    res.json({
      success: true,
      contacts: universalContacts,
      stats,
      summary: {
        message: `Loaded ${stats.totalContacts} contacts: ${stats.orgMembers} org members, ${stats.eventAttendees} event attendees`,
        breakdown: stats
      }
    });

  } catch (error) {
    console.error('❌ UNIVERSAL HYDRATION ERROR:', error);
    res.status(500).json({ error: 'Failed to load universal data: ' + error.message });
  }
});

export default router;
