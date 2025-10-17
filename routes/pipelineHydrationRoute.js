import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { mapToOfficialStage, OFFICIAL_AUDIENCES } from '../config/pipelineConfig.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /events/:eventId/pipeline?audienceType=org_members
 * 
 * 🔥 CONTACT-FIRST: Returns Contacts grouped by currentStage for a specific audienceType
 * Uses Contact model directly - no EventAttendee!
 */
router.get('/:eventId/pipeline', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { audienceType } = req.query;

    console.log('📊 Loading pipeline for event:', eventId, 'audienceType:', audienceType);

    // DEBUG: Check what audience types actually exist for this event
    try {
      const allAudiences = await prisma.$queryRaw`
        SELECT DISTINCT "audienceType", COUNT(*) as count 
        FROM "Contact" 
        WHERE "eventId" = ${eventId}
        GROUP BY "audienceType"
      `;
      console.log('🔍 ALL AUDIENCE TYPES for this event:', allAudiences);
    } catch (audienceError) {
      console.error('❌ Error checking audience types:', audienceError);
    }

    if (!audienceType) {
      return res.status(400).json({ error: 'audienceType query param required' });
    }


    // 🔥 CONTACT-FIRST: Query Contact model directly
    const contacts = await prisma.contact.findMany({
      where: {
        eventId,
        audienceType
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${contacts.length} contacts for audienceType: ${audienceType}`);
    console.log('🔍 Contact results:', contacts);
    
    // DEBUG: Check if contacts are missing data
    contacts.forEach((contact, index) => {
      if (!contact.firstName) {
        console.log(`❌ Contact ${index} missing first name:`, contact);
      } else {
        console.log(`✅ Contact ${index} has data:`, contact.firstName, contact.lastName);
      }
    });

    // Group by currentStage (mapped to official schema stages)
    const stageGroups = {};
    contacts.forEach(contact => {
      const rawStage = contact.currentStage || 'in_funnel';
      const mappedStage = mapToOfficialStage(rawStage); // Map to official stage
      
      if (rawStage !== mappedStage) {
        console.log(`🔄 Mapping stage: "${rawStage}" → "${mappedStage}" for contact ${contact.id}`);
      }
      
      if (!stageGroups[mappedStage]) {
        stageGroups[mappedStage] = [];
      }
      
      // Check if contact data exists
      if (!contact.firstName) {
        console.log('⚠️ Contact missing first name:', contact.id);
        return; // Skip this contact
      }

      // Map to frontend-friendly format
      stageGroups[mappedStage].push({
        _id: contact.id,  // Use contact id as _id for frontend compatibility
        contactId: contact.id,  // Explicit contactId for clarity
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        categoryOfEngagement: 'medium',  // Default to medium
        currentStage: mappedStage,  // Use mapped stage for consistency
        rawStage: rawStage,  // Keep original for debugging
        audienceType: contact.audienceType
      });
    });

    // Convert to array format expected by frontend
    const registryData = Object.keys(stageGroups).map(stage => ({
      stage,
      count: stageGroups[stage].length,
      contacts: stageGroups[stage]
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
 * 🔥 CONTACT-FIRST: Moves a contact from one stage to another in the pipeline
 * Updates Contact.currentStage directly
 */
router.patch('/:eventId/pipeline/move', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { supporterId, fromStage, toStage, audienceType } = req.body;

    console.log('🔄 Moving contact:', supporterId, 'from', fromStage, 'to', toStage);

    // 🔥 CONTACT-FIRST: Update Contact's currentStage
    const updated = await prisma.contact.updateMany({
      where: {
        id: supporterId,
        eventId,
        audienceType
      },
      data: {
        currentStage: toStage
      }
    });

    console.log('✅ Updated contact stage');

    res.json({ success: true, updated: updated.count });

  } catch (error) {
    console.error('❌ Pipeline move error:', error);
    res.status(500).json({ error: 'Failed to move contact' });
  }
});

/**
 * POST /events/:eventId/pipeline/push
 * 
 * 🔥 CONTACT-FIRST: Adds selected supporters to the pipeline
 * Updates Contact records to set eventId, audienceType, and currentStage
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

    // 🔥 CONTACT-FIRST: Update Contact records for each supporter
    for (const supporterId of supporterIds) {
      try {
        // Check if contact already has this eventId
        const existing = await prisma.contact.findFirst({
          where: {
            id: supporterId,
            eventId
          }
        });

        if (existing) {
          console.log('⚠️ Contact already in pipeline:', supporterId);
          results.failed.push({ id: supporterId, reason: 'Already in pipeline' });
          continue;
        }

        // Update Contact with event info
        await prisma.contact.update({
          where: { id: supporterId },
          data: {
            eventId,
            audienceType: audienceType || 'org_members',
            currentStage: stage || 'in_funnel'
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
 * 🔥 CONTACT-FIRST: Adds ALL supporters (org members) to the pipeline
 * Updates Contact records for the entire org
 */
router.post('/:eventId/pipeline/push-all', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orgId, audienceType, stage, source } = req.body;

    console.log('➕ Adding ALL org members to pipeline for event:', eventId);

    // Get all org member contacts for this org (that aren't already in this event)
    const contacts = await prisma.contact.findMany({
      where: { 
        orgId,
        isOrgMember: true,
        OR: [
          { eventId: null },
          { eventId: { not: eventId } }
        ]
      }
    });

    const supporterIds = contacts.map(c => c.id);

    const results = {
      success: [],
      failed: []
    };

    // 🔥 CONTACT-FIRST: Update Contact records for each member
    for (const supporterId of supporterIds) {
      try {
        // Update Contact with event info
        await prisma.contact.update({
          where: { id: supporterId },
          data: {
            eventId,
            audienceType: audienceType || 'org_members',
            currentStage: stage || 'in_funnel'
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

