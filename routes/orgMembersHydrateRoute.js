import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// GET /?orgId=xxx - Hydrate all org members with their Contact data
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query;
    console.log('📖 ORG MEMBERS HYDRATE: Getting members for orgId:', orgId);

    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }

    // Get all OrgMembers for this org, include their Contact data and Engagement
    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        contact: {
          include: {
            eventAttendees: {
              include: {
                event: true  // Include event details for upcoming events count
              }
            }
          }
        },
        engagement: true  // Include engagement to get the VALUE
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to flatten Contact into OrgMember for easier frontend use
    const members = orgMembers.map(member => ({
      // OrgMember data
      id: member.id,
      orgMemberId: member.id,
      contactId: member.contactId,
      orgId: member.orgId,
      
      // Contact data (from universal Contact)
      firstName: member.contact?.firstName || member.firstName || '',
      lastName: member.contact?.lastName || member.lastName || '',
      email: member.contact?.email || member.email || '',
      phone: member.contact?.phone || member.phone || '',
      eventId: member.contact?.eventId || null,  // Include eventId for inline editing
      
      // Extended OrgMember data
      goesBy: member.goesBy,
      street: member.street,
      city: member.city,
      state: member.state,
      zip: member.zip,
      employer: member.employer,
      yearsWithOrganization: member.yearsWithOrganization,
      leadershipRole: member.leadershipRole,
      married: member.married,
      spouseName: member.spouseName,
      numberOfKids: member.numberOfKids,
      originStory: member.originStory,
      notes: member.notes,
      engagementValue: member.engagement?.value || null,  // Hydrate the VALUE from Engagement table
      tags: member.tags,
      
      // Upcoming events - simplified (just the names for now)
      upcomingEventNames: member.contact?.eventAttendees
        ?.filter(ea => ea.event && ea.event.status === "upcoming")
        ?.map(ea => ea.event.name) || [],
      upcomingEventsCount: member.contact?.eventAttendees?.filter(ea => 
        ea.event && ea.event.status === "upcoming"
      ).length || 0,
      
      // Metadata
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }));

    console.log(`✅ ORG MEMBERS HYDRATE: Found ${members.length} members`);
    
    // Debug: Check if we have any EventAttendee records at all
    const totalEventAttendees = await prisma.eventAttendee.count({
      where: { orgId }
    });
    console.log(`🔍 DEBUG: Total EventAttendee records for orgId ${orgId}: ${totalEventAttendees}`);
    
    // Debug: Check if we have any Events at all
    const totalEvents = await prisma.event.count({
      where: { orgId }
    });
    console.log(`🔍 DEBUG: Total Event records for orgId ${orgId}: ${totalEvents}`);
    
    // Debug: Check first member's upcoming events
    if (members.length > 0) {
      const firstMember = members[0];
      console.log(`🔍 DEBUG: First member ${firstMember.firstName} ${firstMember.lastName}:`);
      console.log(`🔍 - upcomingEventsCount: ${firstMember.upcomingEventsCount}`);
      console.log(`🔍 - upcomingEvents:`, firstMember.upcomingEvents);
      console.log(`🔍 - Total eventAttendees:`, orgMembers[0]?.contact?.eventAttendees?.length || 0);
      if (orgMembers[0]?.contact?.eventAttendees?.length > 0) {
        orgMembers[0].contact.eventAttendees.forEach((ea, idx) => {
          const eventStatus = ea.event?.status;
          const isUpcoming = eventStatus === "upcoming";
          console.log(`🔍 - EventAttendee ${idx}: event=${ea.event?.name}, status=${eventStatus}, isUpcoming=${isUpcoming}`);
        });
      }
    }
    
    res.json({
      success: true,
      members,
      count: members.length
    });

  } catch (error) {
    console.error('❌ ORG MEMBERS HYDRATE ERROR:', error);
    res.status(500).json({ error: 'Failed to load org members: ' + error.message });
  }
});

// GET /:orgMemberId - Get single org member details
router.get('/:orgMemberId', async (req, res) => {
  try {
    const { orgMemberId } = req.params;
    console.log('📖 ORG MEMBER DETAIL: Getting member:', orgMemberId);

    const orgMember = await prisma.orgMember.findUnique({
      where: { id: orgMemberId },
      include: {
        contact: {
          include: {
            eventAttendees: {
              include: {
                event: true  // Include event details
              }
            }
          }
        }
      }
    });

    if (!orgMember) {
      return res.status(404).json({ error: 'Org member not found' });
    }

    // Transform data
    const member = {
      // OrgMember data
      id: orgMember.id,
      orgMemberId: orgMember.id,
      contactId: orgMember.contactId,
      orgId: orgMember.orgId,
      
      // Contact data
      firstName: orgMember.contact?.firstName || orgMember.firstName || '',
      lastName: orgMember.contact?.lastName || orgMember.lastName || '',
      email: orgMember.contact?.email || orgMember.email || '',
      phone: orgMember.contact?.phone || orgMember.phone || '',
      
      // Extended OrgMember data
      goesBy: orgMember.goesBy,
      street: orgMember.street,
      city: orgMember.city,
      state: orgMember.state,
      zip: orgMember.zip,
      employer: orgMember.employer,
      yearsWithOrganization: orgMember.yearsWithOrganization,
      married: orgMember.married,
      spouseName: orgMember.spouseName,
      numberOfKids: orgMember.numberOfKids,
      originStory: orgMember.originStory,
      notes: orgMember.notes,
      categoryOfEngagement: orgMember.categoryOfEngagement,
      tags: orgMember.tags,
      
      // Event history (from Contact)
      events: orgMember.contact?.eventAttendees?.map(ea => ({
        eventId: ea.eventId,
        eventName: ea.event?.name,
        audienceType: ea.audienceType,
        currentStage: ea.currentStage,
        attendedAt: ea.createdAt
      })) || [],
      
      // Metadata
      createdAt: orgMember.createdAt,
      updatedAt: orgMember.updatedAt
    };

    res.json({
      success: true,
      member
    });

  } catch (error) {
    console.error('❌ ORG MEMBER DETAIL ERROR:', error);
    res.status(500).json({ error: 'Failed to load org member: ' + error.message });
  }
});

export default router;


