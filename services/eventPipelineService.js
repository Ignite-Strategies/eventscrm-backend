/**
 * Event Pipeline Service
 * Manages the funnel: Supporter → EventPipeline → EventAttendee
 */

import Supporter from '../models/Supporter.js';
import EventPipeline from '../models/EventPipeline.js';
import EventAttendee from '../models/EventAttendee.js';

/**
 * Push supporters into event PIPELINE (working funnel)
 * Creates EventPipeline records from existing Supporters
 */
export async function pushSupportersToEvent({
  orgId,
  eventId,
  supporterIds,
  audienceType = "org_member",
  stage = "member",
  source = "admin_add"
}) {
  console.log('🚀 PUSH SUPPORTERS: Starting push operation');
  console.log('🚀 PUSH SUPPORTERS: orgId:', orgId);
  console.log('🚀 PUSH SUPPORTERS: eventId:', eventId);
  console.log('🚀 PUSH SUPPORTERS: supporterIds:', supporterIds);
  console.log('🚀 PUSH SUPPORTERS: audienceType:', audienceType);
  console.log('🚀 PUSH SUPPORTERS: stage:', stage);
  console.log('🚀 PUSH SUPPORTERS: source:', source);

  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  for (const supporterId of supporterIds) {
    try {
      console.log(`🔍 PUSH SUPPORTERS: Processing supporter ${supporterId}`);
      
      // Get supporter from master CRM
      const supporter = await Supporter.findById(supporterId);
      
      if (!supporter) {
        console.log(`❌ PUSH SUPPORTERS: Supporter ${supporterId} not found`);
        results.errors.push({ 
          supporterId, 
          error: "Supporter not found" 
        });
        continue;
      }

      console.log(`✅ PUSH SUPPORTERS: Found supporter:`, {
        id: supporter._id,
        firstName: supporter.firstName,
        lastName: supporter.lastName,
        email: supporter.email,
        phone: supporter.phone
      });

      // Check if already in pipeline
      const existing = await EventPipeline.findOne({
        orgId,
        eventId,
        email: supporter.email
      });

      if (existing) {
        console.log(`⚠️ PUSH SUPPORTERS: Supporter ${supporter.email} already in pipeline`);
        results.skipped.push({
          supporterId,
          email: supporter.email,
          reason: "Already in pipeline"
        });
        continue;
      }

      // Create full name from firstName and lastName
      const fullName = `${supporter.firstName} ${supporter.lastName}`;
      console.log(`📝 PUSH SUPPORTERS: Creating pipeline record with name: "${fullName}"`);

      // Create EventPipeline record (copy from Supporter)
      const pipelineRecord = new EventPipeline({
        orgId,
        eventId,
        supporterId,
        name: fullName, // Use constructed full name
        email: supporter.email,
        phone: supporter.phone,
        audienceType,
        stage,
        source,
        tags: [`source:${source}`, `audience:${audienceType}`]
      });

      console.log(`💾 PUSH SUPPORTERS: Saving pipeline record:`, {
        name: pipelineRecord.name,
        email: pipelineRecord.email,
        stage: pipelineRecord.stage,
        audienceType: pipelineRecord.audienceType
      });

      await pipelineRecord.save();

      console.log(`✅ PUSH SUPPORTERS: Successfully saved pipeline record ${pipelineRecord._id}`);

      results.success.push({
        supporterId,
        pipelineId: pipelineRecord._id,
        email: supporter.email,
        name: fullName
      });

    } catch (error) {
      console.error(`❌ PUSH SUPPORTERS: Error processing supporter ${supporterId}:`, error);
      console.error(`❌ PUSH SUPPORTERS: Error stack:`, error.stack);
      results.errors.push({
        supporterId,
        error: error.message
      });
    }
  }

  console.log('🏁 PUSH SUPPORTERS: Final results:', {
    success: results.success.length,
    errors: results.errors.length,
    skipped: results.skipped.length
  });

  return results;
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
