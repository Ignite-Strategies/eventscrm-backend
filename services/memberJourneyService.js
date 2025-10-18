import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * Determine journey stage based on Contact fields
 * MVP RULES (only 3 active):
 * - ACTIVATED: Has eventId + (attended OR rsvped)
 * - CHAMPION: amountPaid > 0
 * - AWARE: Default
 */
function determineMemberStage(contact) {
  // CHAMPION (highest priority - made donation or payment)
  if (contact.amountPaid && contact.amountPaid > 0) {
    return "CHAMPION";
  }
  
  // ACTIVATED (attended event or RSVPed)
  if (contact.eventId) {
    if (contact.attended === true) {
      return "ACTIVATED";
    }
    if (contact.currentStage === 'rsvped' || contact.currentStage === 'soft_commit') {
      return "ACTIVATED";
    }
  }
  
  // FUTURE STAGES (not detecting yet)
  // ENGAGED: Would check for multiple event attendance
  // CURIOUS: Would check for ad clicks, site visits
  // ALUMNI: Would check lastActivityAt > 90 days
  
  // DEFAULT: Just aware they exist
  return "AWARE";
}

/**
 * Sync MemberJourney record for a contact
 * Auto-creates or updates based on Contact fields
 */
async function syncMemberJourney(contactId, orgId) {
  try {
    // Get contact with all relevant fields
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        eventId: true,
        attended: true,
        currentStage: true,
        amountPaid: true
      }
    });
    
    if (!contact) {
      console.log(`⚠️ Contact ${contactId} not found for journey sync`);
      return null;
    }
    
    // Determine stage from contact data
    const stage = determineMemberStage(contact);
    
    console.log(`🎯 Contact ${contactId} determined stage: ${stage}`);
    
    // Upsert MemberJourney
    const journey = await prisma.memberJourney.upsert({
      where: {
        contactId_orgId: {
          contactId,
          orgId
        }
      },
      update: {
        journeyStage: stage,
        lastActivityAt: new Date()
      },
      create: {
        contactId,
        orgId,
        journeyStage: stage,
        enteredStageAt: new Date(),
        lastActivityAt: new Date()
      }
    });
    
    console.log(`✅ MemberJourney synced: ${contactId} → ${stage}`);
    return journey;
    
  } catch (error) {
    console.error(`❌ Error syncing member journey:`, error);
    throw error;
  }
}

/**
 * Get pipeline counts for an org
 */
async function getPipelineCounts(orgId, containerId) {
  try {
    const journeys = await prisma.memberJourney.findMany({
      where: { orgId },
      select: { journeyStage: true }
    });
    
    // Count by stage
    const counts = {
      UNAWARE: 0,
      CURIOUS: 0,
      ACTIVATED: 0,
      ENGAGED: 0,
      CHAMPION: 0,
      ALUMNI: 0
    };
    
    journeys.forEach(journey => {
      const stage = journey.journeyStage;
      if (counts[stage] !== undefined) {
        counts[stage]++;
      }
    });
    
    return {
      pipeline: counts,
      totalMembers: journeys.length
    };
    
  } catch (error) {
    console.error(`❌ Error getting pipeline counts:`, error);
    throw error;
  }
}

/**
 * Manually update a member's journey stage
 */
async function updateMemberStage(journeyId, newStage, notes = null) {
  try {
    const journey = await prisma.memberJourney.update({
      where: { id: journeyId },
      data: {
        journeyStage: newStage,
        enteredStageAt: new Date(),
        lastActivityAt: new Date(),
        notes: notes || `Manually updated to ${newStage}`
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log(`✅ Manually updated journey: ${journey.contact.email} → ${newStage}`);
    return journey;
    
  } catch (error) {
    console.error(`❌ Error updating member stage:`, error);
    throw error;
  }
}

export {
  determineMemberStage,
  syncMemberJourney,
  getPipelineCounts,
  updateMemberStage
};

