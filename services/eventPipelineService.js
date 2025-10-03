/**
 * Event Pipeline Service (Registry Format)
 * Manages the funnel using registry records with supporter arrays
 */

import Supporter from '../models/Supporter.js';
import EventPipeline from '../models/EventPipeline.js';
import EventAttendee from '../models/EventAttendee.js';

/**
 * Push supporters into event registry
 * Adds supporter IDs to the appropriate registry stage
 */
export async function pushSupportersToEvent({
  orgId,
  eventId,
  supporterIds,
  audienceType = "org_member",
  stage = "member",
  source = "admin_add"
}) {
  console.log('🚀 REGISTRY PUSH: Starting registry push operation');
  console.log('🚀 REGISTRY PUSH: orgId:', orgId);
  console.log('🚀 REGISTRY PUSH: eventId:', eventId);
  console.log('🚀 REGISTRY PUSH: supporterIds:', supporterIds);
  console.log('🚀 REGISTRY PUSH: audienceType:', audienceType);
  console.log('🚀 REGISTRY PUSH: stage:', stage);
  console.log('🚀 REGISTRY PUSH: source:', source);

  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  // Validate all supporters exist first
  const validSupporterIds = [];
  for (const supporterId of supporterIds) {
    try {
      const supporter = await Supporter.findById(supporterId);
      if (!supporter) {
        console.log(`❌ REGISTRY PUSH: Supporter ${supporterId} not found`);
        results.errors.push({ 
          supporterId, 
          error: "Supporter not found" 
        });
        continue;
      }
      validSupporterIds.push(supporterId);
      console.log(`✅ REGISTRY PUSH: Valid supporter: ${supporter.firstName} ${supporter.lastName}`);
    } catch (error) {
      console.error(`❌ REGISTRY PUSH: Error validating supporter ${supporterId}:`, error);
      results.errors.push({
        supporterId,
        error: error.message
      });
    }
  }

  if (validSupporterIds.length === 0) {
    console.log('❌ REGISTRY PUSH: No valid supporters to add');
    return results;
  }

  try {
    // Find or create registry record for this stage
    let registryRecord = await EventPipeline.findOne({
      orgId,
      eventId,
      audienceType,
      stage
    });

    if (!registryRecord) {
      console.log(`📝 REGISTRY PUSH: Creating new registry record for ${audienceType}/${stage}`);
      registryRecord = new EventPipeline({
        orgId,
        eventId,
        audienceType,
        stage,
        supporterIds: [],
        source
      });
    }

    // Add supporter IDs to registry (avoid duplicates)
    const existingIds = new Set(registryRecord.supporterIds.map(id => id.toString()));
    const newIds = validSupporterIds.filter(id => !existingIds.has(id.toString()));
    
    if (newIds.length > 0) {
      registryRecord.supporterIds.push(...newIds);
      await registryRecord.save();
      console.log(`✅ REGISTRY PUSH: Added ${newIds.length} supporters to ${audienceType}/${stage}`);
    }

    // Track results
    for (const supporterId of validSupporterIds) {
      if (existingIds.has(supporterId.toString())) {
        results.skipped.push({
          supporterId,
          reason: "Already in registry"
        });
      } else {
        results.success.push({
          supporterId,
          registryId: registryRecord._id,
          stage,
          audienceType
        });
      }
    }

  } catch (error) {
    console.error('❌ REGISTRY PUSH: Error updating registry:', error);
    results.errors.push({
      error: error.message
    });
  }

  console.log('🏁 REGISTRY PUSH: Final results:', {
    success: results.success.length,
    errors: results.errors.length,
    skipped: results.skipped.length
  });

  return results;
}

/**
 * Get event registry with populated supporter details
 */
export async function getEventRegistry(eventId, audienceType = "org_member") {
  console.log('📋 REGISTRY GET: Getting registry for event:', eventId, 'audience:', audienceType);
  
  try {
    // Get registry records for this event and audience
    const registryRecords = await EventPipeline.find({
      eventId,
      audienceType
    }).populate('supporterIds', 'firstName lastName email phone categoryOfEngagement');

    console.log('📋 REGISTRY GET: Found', registryRecords.length, 'registry records');

    // Transform to frontend-friendly format
    const stages = ['member', 'soft_commit', 'paid'];
    const result = stages.map(stage => {
      const record = registryRecords.find(r => r.stage === stage);
      return {
        stage,
        supporters: record ? record.supporterIds : [],
        count: record ? record.supporterIds.length : 0
      };
    });

    console.log('📋 REGISTRY GET: Returning stages:', result.map(r => ({ stage: r.stage, count: r.count })));
    return result;
  } catch (error) {
    console.error('❌ REGISTRY GET: Error:', error);
    throw error;
  }
}

/**
 * Move supporter between stages in registry
 */
export async function moveSupporterStage(eventId, supporterId, fromStage, toStage, audienceType = "org_member") {
  console.log('🔄 REGISTRY MOVE: Moving supporter', supporterId, 'from', fromStage, 'to', toStage);
  
  try {
    // Remove from source stage
    if (fromStage) {
      await EventPipeline.updateOne(
        { eventId, audienceType, stage: fromStage },
        { $pull: { supporterIds: supporterId } }
      );
      console.log('🔄 REGISTRY MOVE: Removed from', fromStage);
    }

    // Add to target stage
    await EventPipeline.updateOne(
      { eventId, audienceType, stage: toStage },
      { $addToSet: { supporterIds: supporterId } },
      { upsert: true }
    );
    console.log('🔄 REGISTRY MOVE: Added to', toStage);

    return { success: true };
  } catch (error) {
    console.error('❌ REGISTRY MOVE: Error:', error);
    throw error;
  }
}

/**
 * Push ALL supporters to event (bulk)
 */
export async function pushAllSupportersToEvent({
  orgId,
  eventId,
  audienceType = "org_member",
  stage = "member",
  source = "bulk_import"
}) {
  // Get all supporters for org
  const supporters = await Supporter.find({ orgId });
  const supporterIds = supporters.map(s => s._id);

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
 * Push supporters by tag filter
 */
export async function pushSupportersByTag({
  orgId,
  eventId,
  tags,
  audienceType = "org_member",
  stage = "member",
  source = "tag_filter"
}) {
  // Find supporters with matching tags
  const supporters = await Supporter.find({
    orgId,
    tags: { $in: tags }
  });

  const supporterIds = supporters.map(s => s._id);

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
 * Graduate pipeline record to FINAL ATTENDEE
 * Called when they reach "paid" stage
 */
export async function graduateToAttendee(pipelineId) {
  const pipelineRecord = await EventPipeline.findById(pipelineId);
  
  if (!pipelineRecord) {
    throw new Error("Pipeline record not found");
  }

  if (!pipelineRecord.paid) {
    throw new Error("Cannot graduate - not paid yet");
  }

  // Check if already graduated
  const existing = await EventAttendee.findOne({
    orgId: pipelineRecord.orgId,
    eventId: pipelineRecord.eventId,
    email: pipelineRecord.email
  });

  if (existing) {
    return existing; // Already graduated
  }

  // Create final EventAttendee record
  const attendee = new EventAttendee({
    orgId: pipelineRecord.orgId,
    eventId: pipelineRecord.eventId,
    supporterId: pipelineRecord.supporterId,
    name: pipelineRecord.name,
    email: pipelineRecord.email,
    phone: pipelineRecord.phone,
    audienceType: pipelineRecord.audienceType,
    paid: pipelineRecord.paid,
    amount: pipelineRecord.amount,
    paymentDate: pipelineRecord.paymentDate,
    paymentMethod: "stripe", // TODO: determine from context
    source: pipelineRecord.source,
    engagementScore: pipelineRecord.engagementScore,
    tags: pipelineRecord.tags,
    dietaryRestrictions: pipelineRecord.dietaryRestrictions,
    plusOne: pipelineRecord.plusOne,
    notes: pipelineRecord.notes
  });

  await attendee.save();

  // Update supporter with event participation tags
  await syncAttendeeToSupporter(attendee._id);

  return attendee;
}

/**
 * Sync attendee back to supporter (update master CRM)
 */
export async function syncAttendeeToSupporter(attendeeId) {
  const attendee = await EventAttendee.findById(attendeeId).populate('supporterId');
  
  if (!attendee || !attendee.supporterId) {
    throw new Error("Attendee or supporter not found");
  }

  const supporter = attendee.supporterId;
  const eventTag = `event:${attendee.eventId}`;
  const paidTag = `event:${attendee.eventId}:paid`;
  
  // Add event participation tags
  if (!supporter.tags.includes(eventTag)) {
    supporter.tags.push(eventTag);
  }

  if (attendee.paid && !supporter.tags.includes(paidTag)) {
    supporter.tags.push(paidTag);
  }

  // If attended, add that tag too
  if (attendee.attended) {
    const attendedTag = `event:${attendee.eventId}:attended`;
    if (!supporter.tags.includes(attendedTag)) {
      supporter.tags.push(attendedTag);
    }
  }

  // Update donation history if paid amount
  if (attendee.paid && attendee.amount > 0) {
    supporter.donationHistory.push({
      amount: attendee.amount,
      date: attendee.paymentDate || attendee.registeredDate,
      campaign: attendee.eventId.toString()
    });
    supporter.totalDonated = (supporter.totalDonated || 0) + attendee.amount;
  }

  await supporter.save();
  return supporter;
}
