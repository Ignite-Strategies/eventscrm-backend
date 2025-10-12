import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/:eventId/pipeline?audienceType=org_members
 * 
 * Returns EventAttendees grouped by currentStage for a specific audienceType
 * This is the NEW pipeline - queries EventAttendee directly (no EventPipeline model)
 */
router.get('/:eventId/pipeline', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType } = req.query;

    console.log('📊 Loading pipeline for event:', eventId, 'audienceType:', audienceType);

    if (!audienceType) {
      return res.status(400).json({ error: 'audienceType query param required' });
    }

    // Fetch all EventAttendees for this event + audienceType
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        audienceType
      },
      include: {
        contact: true  // Include contact details (firstName, lastName, email, phone)
      }
    });

    console.log(`✅ Found ${attendees.length} attendees for audienceType: ${audienceType}`);
    console.log('🔍 Attendees data:', JSON.stringify(attendees, null, 2));

    // Group by currentStage
    const stageGroups = {};
    attendees.forEach(attendee => {
      const stage = attendee.currentStage || 'in_funnel';
      if (!stageGroups[stage]) {
        stageGroups[stage] = [];
      }
      
      // Check if contact exists
      if (!attendee.contact) {
        console.log('⚠️ EventAttendee missing contact data:', attendee.id, 'contactId:', attendee.contactId);
        return; // Skip this attendee
      }

      // Map to frontend-friendly format
      stageGroups[stage].push({
        _id: attendee.contact.id,  // Use contactId as _id for frontend compatibility
        contactId: attendee.contact.id,  // Explicit contactId for clarity
        attendeeId: attendee.id,  // EventAttendee ID for updates
        firstName: attendee.contact.firstName,
        lastName: attendee.contact.lastName,
        email: attendee.contact.email,
        phone: attendee.contact.phone,
        categoryOfEngagement: attendee.engagementLevel || 'medium',  // Default to medium if not set
        currentStage: attendee.currentStage,
        audienceType: attendee.audienceType
      });
    });

    // Convert to array format expected by frontend
    const registryData = Object.keys(stageGroups).map(stage => ({
      stage,
      count: stageGroups[stage].length,
      contacts: stageGroups[stage]  // NEW: contacts (not deprecated supporters)
    }));

    console.log('📋 Registry data:', registryData);

    res.json(registryData);

  } catch (error) {
    console.error('❌ Pipeline load error:', error);
    res.status(500).json({ error: 'Failed to load pipeline' });
  }
});

/**
 * PATCH /events/:eventId/pipeline/move
 * 
 * Moves a contact from one stage to another in the pipeline
 */
router.patch('/:eventId/pipeline/move', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { supporterId, fromStage, toStage, audienceType } = req.body;

    console.log('🔄 Moving contact:', supporterId, 'from', fromStage, 'to', toStage);

    // Update the EventAttendee's currentStage
    const updated = await prisma.eventAttendee.updateMany({
      where: {
        eventId,
        contactId: supporterId,  // supporterId is actually contactId
        audienceType
      },
      data: {
        currentStage: toStage
      }
    });

    console.log('✅ Updated attendee stage');

    res.json({ success: true, updated: updated.count });

  } catch (error) {
    console.error('❌ Pipeline move error:', error);
    res.status(500).json({ error: 'Failed to move contact' });
  }
});

/**
 * POST /events/:eventId/pipeline/push
 * 
 * Adds selected supporters to the pipeline
 */
router.post('/:eventId/pipeline/push', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, supporterIds, audienceType, stage, source } = req.body;

    console.log('➕ Adding supporters to pipeline:', supporterIds);

    const results = {
      success: [],
      failed: []
    };

    // Create EventAttendee records for each supporter
    for (const supporterId of supporterIds) {
      try {
        // Check if already exists
        const existing = await prisma.eventAttendee.findUnique({
          where: {
            eventId_contactId_audienceType: {
              eventId,
              contactId: supporterId,
              audienceType
            }
          }
        });

        if (existing) {
          console.log('⚠️ Attendee already exists:', supporterId);
          results.failed.push({ id: supporterId, reason: 'Already in pipeline' });
          continue;
        }

        // Create new EventAttendee
        await prisma.eventAttendee.create({
          data: {
            orgId,
            eventId,
            contactId: supporterId,
            audienceType,
            currentStage: stage || 'in_funnel',
            source: source || 'admin_add'
          }
        });

        results.success.push(supporterId);

      } catch (error) {
        console.error('❌ Error adding supporter:', supporterId, error);
        results.failed.push({ id: supporterId, reason: error.message });
      }
    }

    console.log('✅ Added', results.success.length, 'supporters to pipeline');

    res.json(results);

  } catch (error) {
    console.error('❌ Pipeline push error:', error);
    res.status(500).json({ error: 'Failed to add supporters to pipeline' });
  }
});

/**
 * POST /events/:eventId/pipeline/push-all
 * 
 * Adds ALL supporters (OrgMembers) to the pipeline
 */
router.post('/:eventId/pipeline/push-all', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, audienceType, stage, source } = req.body;

    console.log('➕ Adding ALL supporters to pipeline for event:', eventId);

    // Get all OrgMembers (via Contact) for this org
    const contacts = await prisma.contact.findMany({
      where: { orgId }
    });

    const supporterIds = contacts.map(c => c.id);

    const results = {
      success: [],
      failed: []
    };

    // Create EventAttendee records for each contact
    for (const supporterId of supporterIds) {
      try {
        // Check if already exists
        const existing = await prisma.eventAttendee.findUnique({
          where: {
            eventId_contactId_audienceType: {
              eventId,
              contactId: supporterId,
              audienceType
            }
          }
        });

        if (existing) {
          console.log('⚠️ Attendee already exists:', supporterId);
          results.failed.push({ id: supporterId, reason: 'Already in pipeline' });
          continue;
        }

        // Create new EventAttendee
        await prisma.eventAttendee.create({
          data: {
            orgId,
            eventId,
            contactId: supporterId,
            audienceType,
            currentStage: stage || 'in_funnel',
            source: source || 'bulk_add'
          }
        });

        results.success.push(supporterId);

      } catch (error) {
        console.error('❌ Error adding supporter:', supporterId, error);
        results.failed.push({ id: supporterId, reason: error.message });
      }
    }

    console.log('✅ Added', results.success.length, 'supporters to pipeline');

    res.json(results);

  } catch (error) {
    console.error('❌ Pipeline push-all error:', error);
    res.status(500).json({ error: 'Failed to add all supporters to pipeline' });
  }
});

export default router;

