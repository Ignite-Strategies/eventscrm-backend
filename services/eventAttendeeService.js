import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Auto-populate event pipeline with all existing OrgMembers
 * Called when an event is created
 */
export async function populateEventPipeline(eventId, orgId) {
  try {
    console.log('🎯 POPULATE PIPELINE: eventId:', eventId, 'orgId:', orgId);
    
    // Get all OrgMembers for this org
    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId }
    });
    
    console.log(`📋 Found ${orgMembers.length} OrgMembers to add to pipeline`);
    
    if (orgMembers.length === 0) {
      console.log('⚠️ No OrgMembers found - pipeline will be empty');
      return { success: true, added: 0, message: 'No contacts to add' };
    }
    
    // Create EventAttendee records for all OrgMembers
    const attendees = orgMembers.map(member => ({
      orgId,
      eventId,
      orgMemberId: member.id,
      stage: 'in_funnel',
      audienceType: 'org_members',
      attended: false,
      amountPaid: 0
    }));
    
    // Bulk create (skip duplicates if any exist)
    const result = await prisma.eventAttendee.createMany({
      data: attendees,
      skipDuplicates: true
    });
    
    console.log(`✅ Pipeline populated: ${result.count} EventAttendees created`);
    
    return {
      success: true,
      added: result.count,
      total: orgMembers.length
    };
    
  } catch (error) {
    console.error('❌ Pipeline population error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add or update a single person in the event pipeline
 * Used by: soft commit forms, CSV import, manual add
 */
export async function addToEventPipeline(eventId, contactData, targetStage = 'in_funnel') {
  try {
    const { name, email, phone, orgId } = contactData;
    
    console.log('🎯 ADD TO PIPELINE:', email, '→ stage:', targetStage);
    
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    // Parse name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // 1. Find or create OrgMember
    let orgMember = await prisma.orgMember.findFirst({
      where: {
        orgId: orgId || event.orgId,
        email: email.toLowerCase().trim()
      }
    });
    
    if (orgMember) {
      console.log('✅ Existing OrgMember found:', orgMember.id);
      
      // Update phone if provided and missing
      if (phone && !orgMember.phone) {
        orgMember = await prisma.orgMember.update({
          where: { id: orgMember.id },
          data: { phone }
        });
      }
    } else {
      console.log('📝 Creating new OrgMember');
      
      orgMember = await prisma.orgMember.create({
        data: {
          orgId: orgId || event.orgId,
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          role: null,
          firebaseId: null,
          categoryOfEngagement: 'medium',
          tags: []
        }
      });
    }
    
    // 2. Find or create EventAttendee with smart stage progression
    // 7-stage funnel (updated today)
    const stageHierarchy = {
      'in_funnel': 0,
      'general_awareness': 1,
      'personal_invite': 2,
      'expressed_interest': 3,
      'soft_commit': 4,
      'paid': 5,
      'cant_attend': -1 // Special: can always re-engage
    };
    
    let eventAttendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_orgMemberId: {
          eventId: event.id,
          orgMemberId: orgMember.id
        }
      }
    });
    
    if (eventAttendee) {
      console.log('✅ EventAttendee exists, current stage:', eventAttendee.stage);
      
      const currentLevel = stageHierarchy[eventAttendee.stage] || 0;
      const targetLevel = stageHierarchy[targetStage];
      
      // Only move forward or re-engage from cant_attend
      if (currentLevel < targetLevel || eventAttendee.stage === 'cant_attend') {
        console.log('📈 Moving forward:', eventAttendee.stage, '→', targetStage);
        
        eventAttendee = await prisma.eventAttendee.update({
          where: { id: eventAttendee.id },
          data: { stage: targetStage }
        });
      } else {
        console.log('⚠️ Already at higher stage, not downgrading');
      }
    } else {
      console.log('📝 Creating new EventAttendee at stage:', targetStage);
      
      eventAttendee = await prisma.eventAttendee.create({
        data: {
          orgId: orgId || event.orgId,
          eventId: event.id,
          orgMemberId: orgMember.id,
          stage: targetStage,
          audienceType: 'landing_page',
          attended: false,
          amountPaid: 0
        }
      });
    }
    
    return {
      success: true,
      orgMember,
      eventAttendee
    };
    
  } catch (error) {
    console.error('❌ Add to pipeline error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

