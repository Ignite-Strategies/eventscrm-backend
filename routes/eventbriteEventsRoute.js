/**
 * 🎟️ Eventbrite Events Route
 * Handles fetching events and attendees from Eventbrite
 * Imports attendees as Contacts
 */

import express from 'express';
import { getPrismaClient } from '../config/database.js';
import {
  getEventbriteConnection,
  getEventbriteEvents,
  getEventbriteEvent,
  getEventbriteAttendees,
  mapEventbriteAttendeeToContact
} from '../services/eventbriteApiService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 📋 Get all Eventbrite events for connected account
 * GET /api/eventbrite/events?orgId=xxx&containerId=xxx&status=live
 */
router.get('/events', async (req, res) => {
  try {
    const { orgId, containerId, status } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({
        error: 'orgId and containerId are required'
      });
    }
    
    console.log(`📋 Fetching Eventbrite events for org: ${orgId}, container: ${containerId}`);
    
    // Get connection
    const connectionResult = await getEventbriteConnection(prisma, orgId, containerId);
    
    if (!connectionResult.success) {
      return res.status(404).json({
        error: connectionResult.error
      });
    }
    
    const connection = connectionResult.data;
    
    // Fetch events from Eventbrite
    const eventsResult = await getEventbriteEvents(connection.accessToken, {
      status: status || 'live',
      orderBy: 'start_desc'
    });
    
    if (!eventsResult.success) {
      return res.status(500).json({
        error: eventsResult.error
      });
    }
    
    console.log(`✅ Found ${eventsResult.data.length} Eventbrite events`);
    
    res.json({
      success: true,
      events: eventsResult.data,
      count: eventsResult.data.length,
      pagination: eventsResult.pagination
    });
    
  } catch (error) {
    console.error('❌ Error fetching Eventbrite events:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * 🎟️ Get single Eventbrite event details
 * GET /api/eventbrite/events/:eventbriteEventId?orgId=xxx&containerId=xxx
 */
router.get('/events/:eventbriteEventId', async (req, res) => {
  try {
    const { eventbriteEventId } = req.params;
    const { orgId, containerId } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({
        error: 'orgId and containerId are required'
      });
    }
    
    console.log(`🎟️ Fetching Eventbrite event: ${eventbriteEventId}`);
    
    // Get connection
    const connectionResult = await getEventbriteConnection(prisma, orgId, containerId);
    
    if (!connectionResult.success) {
      return res.status(404).json({
        error: connectionResult.error
      });
    }
    
    const connection = connectionResult.data;
    
    // Fetch event from Eventbrite
    const eventResult = await getEventbriteEvent(connection.accessToken, eventbriteEventId);
    
    if (!eventResult.success) {
      return res.status(500).json({
        error: eventResult.error
      });
    }
    
    console.log(`✅ Found Eventbrite event: ${eventResult.data.name.text}`);
    
    res.json({
      success: true,
      event: eventResult.data
    });
    
  } catch (error) {
    console.error('❌ Error fetching Eventbrite event:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * 👥 Get attendees for an Eventbrite event (without importing)
 * GET /api/eventbrite/events/:eventbriteEventId/attendees?orgId=xxx&containerId=xxx
 */
router.get('/events/:eventbriteEventId/attendees', async (req, res) => {
  try {
    const { eventbriteEventId } = req.params;
    const { orgId, containerId, status } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({
        error: 'orgId and containerId are required'
      });
    }
    
    console.log(`👥 Fetching attendees for Eventbrite event: ${eventbriteEventId}`);
    
    // Get connection
    const connectionResult = await getEventbriteConnection(prisma, orgId, containerId);
    
    if (!connectionResult.success) {
      return res.status(404).json({
        error: connectionResult.error
      });
    }
    
    const connection = connectionResult.data;
    
    // Fetch attendees from Eventbrite
    const attendeesResult = await getEventbriteAttendees(connection.accessToken, eventbriteEventId, {
      status: status || 'attending'
    });
    
    if (!attendeesResult.success) {
      return res.status(500).json({
        error: attendeesResult.error
      });
    }
    
    console.log(`✅ Found ${attendeesResult.count} attendees`);
    
    res.json({
      success: true,
      attendees: attendeesResult.data,
      count: attendeesResult.count
    });
    
  } catch (error) {
    console.error('❌ Error fetching attendees:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * ⬇️ Import attendees from Eventbrite event into CRM as Contacts
 * POST /api/eventbrite/events/:eventbriteEventId/import
 * Body: { orgId, containerId, eventId }
 */
router.post('/events/:eventbriteEventId/import', async (req, res) => {
  try {
    const { eventbriteEventId } = req.params;
    const { orgId, containerId, eventId } = req.body;
    
    if (!orgId || !containerId || !eventId) {
      return res.status(400).json({
        error: 'orgId, containerId, and eventId are required in request body'
      });
    }
    
    console.log(`⬇️ Importing attendees from Eventbrite event ${eventbriteEventId} to CRM event ${eventId}`);
    
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { org: true }
    });
    
    if (!event) {
      return res.status(404).json({
        error: 'Event not found in CRM'
      });
    }
    
    // Verify event belongs to org
    if (event.orgId !== orgId) {
      return res.status(403).json({
        error: 'Event does not belong to specified organization'
      });
    }
    
    // Get connection
    const connectionResult = await getEventbriteConnection(prisma, orgId, containerId);
    
    if (!connectionResult.success) {
      return res.status(404).json({
        error: connectionResult.error
      });
    }
    
    const connection = connectionResult.data;
    
    // Fetch attendees from Eventbrite
    console.log(`📥 Fetching attendees from Eventbrite...`);
    const attendeesResult = await getEventbriteAttendees(connection.accessToken, eventbriteEventId, {
      status: 'attending'
    });
    
    if (!attendeesResult.success) {
      return res.status(500).json({
        error: attendeesResult.error
      });
    }
    
    console.log(`✅ Found ${attendeesResult.count} attendees to import`);
    
    // Import attendees as Contacts
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const attendee of attendeesResult.data) {
      try {
        // Map to Contact structure
        const contactData = mapEventbriteAttendeeToContact(attendee, {
          orgId,
          eventId,
          containerId
        });
        
        // Check if contact already exists (by email)
        const existingContact = await prisma.contact.findUnique({
          where: { email: contactData.email }
        });
        
        if (existingContact) {
          // Update existing contact
          await prisma.contact.update({
            where: { email: contactData.email },
            data: {
              ...contactData,
              // Don't overwrite existing data with null values
              firstName: contactData.firstName || existingContact.firstName,
              lastName: contactData.lastName || existingContact.lastName,
              phone: contactData.phone || existingContact.phone,
              updatedAt: new Date()
            }
          });
          updatedCount++;
          console.log(`✏️ Updated contact: ${contactData.email}`);
        } else {
          // Create new contact
          await prisma.contact.create({
            data: contactData
          });
          importedCount++;
          console.log(`✅ Created contact: ${contactData.email}`);
        }
      } catch (contactError) {
        console.error(`❌ Error importing attendee ${attendee.id}:`, contactError);
        errors.push({
          attendeeId: attendee.id,
          email: attendee.profile?.email,
          error: contactError.message
        });
        skippedCount++;
      }
    }
    
    console.log(`🎉 Import complete: ${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
    
    res.json({
      success: true,
      message: 'Attendees imported successfully',
      stats: {
        total: attendeesResult.count,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount
      },
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error importing attendees:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;

