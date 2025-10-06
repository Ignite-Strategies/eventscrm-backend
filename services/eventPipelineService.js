/**
 * Event Pipeline Service (Registry Format)
 * Manages the funnel using registry records with supporter arrays
 */

import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Push supporters into event registry
 * Adds supporter IDs to the appropriate registry stage
 */
export async function pushSupportersToEvent({
  orgId,
  eventId,
  supporterIds,
  audienceType = "org_member",
  stage = "in_funnel",
  source = "admin_add"
}) {
  console.log('🚀 REGISTRY PUSH: Starting registry push operation');
  console.log('🚀 REGISTRY PUSH: eventId:', eventId, 'stage:', stage, 'count:', supporterIds.length);

  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  // Validate all supporters exist first
  const validSupporterIds = [];
  for (const supporterId of supporterIds) {
    try {
      const supporter = await prisma.supporter.findUnique({
        where: { id: supporterId }
      });
      
      if (!supporter) {
        results.errors.push({ supporterId, error: "Supporter not found" });
        continue;
      }
      
      validSupporterIds.push(supporterId);
      console.log(`✅ Valid supporter: ${supporter.firstName} ${supporter.lastName}`);
    } catch (error) {
      results.errors.push({ supporterId, error: error.message });
    }
  }

  if (validSupporterIds.length === 0) {
    console.log('❌ No valid supporters to add');
    return results;
  }

  // Create pipeline entries for each supporter
  for (const supporterId of validSupporterIds) {
    try {
      // Check if already exists
      const existing = await prisma.eventPipelineEntry.findUnique({
        where: {
          eventId_supporterId_audienceType: {
            eventId,
            supporterId,
            audienceType
          }
        }
      });

      if (existing) {
        results.skipped.push({ supporterId, reason: "Already in pipeline" });
        continue;
      }

      // Create new pipeline entry
      await prisma.eventPipelineEntry.create({
        data: {
          orgId,
          eventId,
          supporterId,
          audienceType,
          stage,
          source
        }
      });

      results.success.push({ supporterId });
    } catch (error) {
      results.errors.push({ supporterId, error: error.message });
    }
  }

  console.log(`✅ Added ${results.success.length} supporters to pipeline`);
  return results;
}

/**
 * Push ALL supporters to event
 */
export async function pushAllSupportersToEvent({
  orgId,
  eventId,
  audienceType = "org_member",
  stage = "in_funnel",
  source = "bulk_import"
}) {
  // Get all supporters for org
  const supporters = await prisma.supporter.findMany({
    where: { orgId }
  });

  const supporterIds = supporters.map(s => s.id);
  
  return await pushSupportersToEvent({
    orgId,
    eventId,
    supporterIds,
    audienceType,
    stage,
    source
  });
}

/**
 * Push supporters by tag to event
 */
export async function pushSupportersByTag({
  orgId,
  eventId,
  tags,
  audienceType = "org_member",
  stage = "in_funnel",
  source = "tag_filter"
}) {
  console.log('🏷️ TAG PUSH: Finding supporters with tags:', tags);

  // Find supporters with matching tags
  const supporters = await prisma.supporter.findMany({
    where: {
      orgId,
      tags: {
        some: {
          OR: tags.map(tag => ({
            name: tag.name,
            value: tag.value
          }))
        }
      }
    }
  });

  console.log(`🏷️ Found ${supporters.length} supporters with matching tags`);

  const supporterIds = supporters.map(s => s.id);
  
  return await pushSupportersToEvent({
    orgId,
    eventId,
    supporterIds,
    audienceType,
    stage,
    source
  });
}

/**
 * Get event registry (hydrated with supporter data)
 */
export async function getEventRegistry(eventId, audienceType) {
  console.log('📋 GET REGISTRY: eventId:', eventId, 'audienceType:', audienceType);

  // New 7-stage funnel
  const stages = ['in_funnel', 'general_awareness', 'personal_invite', 'expressed_interest', 'soft_commit', 'paid', 'cant_attend'];
  const registryData = [];

  for (const stage of stages) {
    const entries = await prisma.eventPipelineEntry.findMany({
      where: {
        eventId,
        audienceType,
        stage
      },
      include: {
        supporter: true
      }
    });

    registryData.push({
      stage,
      count: entries.length,
      supporters: entries.map(e => e.supporter)
    });
  }

  console.log('📋 Registry data:', registryData.map(r => `${r.stage}: ${r.count}`).join(', '));
  return registryData;
}

/**
 * Move supporter between stages
 */
export async function moveSupporterStage(eventId, supporterId, fromStage, toStage, audienceType) {
  console.log('🔄 MOVE: Moving', supporterId, 'from', fromStage, 'to', toStage);

  try {
    // Update the pipeline entry
    const entry = await prisma.eventPipelineEntry.updateMany({
      where: {
        eventId,
        supporterId,
        audienceType,
        stage: fromStage
      },
      data: {
        stage: toStage
      }
    });

    if (entry.count === 0) {
      return {
        success: false,
        error: 'Pipeline entry not found'
      };
    }

    // If moving to paid, could trigger attendee graduation
    if (toStage === 'paid') {
      await graduateToAttendee(eventId, supporterId);
    }

    return {
      success: true,
      supporterId,
      fromStage,
      toStage
    };
  } catch (error) {
    console.error('❌ MOVE ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Graduate supporter to final attendee
 */
export async function graduateToAttendee(eventId, supporterId) {
  console.log('🎓 GRADUATE: Moving supporter to attendee:', supporterId);

  try {
    // Get pipeline entry
    const pipelineEntry = await prisma.eventPipelineEntry.findFirst({
      where: {
        eventId,
        supporterId,
        stage: 'paid'
      }
    });

    if (!pipelineEntry) {
      return null;
    }

    // Create or update attendee record
    const attendee = await prisma.eventAttendee.upsert({
      where: {
        eventId_supporterId: {
          eventId,
          supporterId
        }
      },
      update: {
        attended: true,
        amountPaid: 0 // Update from payment data if available
      },
      create: {
        orgId: pipelineEntry.orgId,
        eventId,
        supporterId,
        attended: true,
        amountPaid: 0
      }
    });

    console.log('🎓 GRADUATE: Created attendee record');
    return attendee;
  } catch (error) {
    console.error('❌ GRADUATE ERROR:', error);
    return null;
  }
}
