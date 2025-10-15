import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * Stage Movement Service
 * Auto-moves contacts through pipeline stages based on email activity
 * 
 * CONCEPT: Every action stage has a follow-up stage
 * - rsvped → thanked (after RSVP confirmation email)
 * - paid → thanked_paid (after payment thank you email)
 * - attended → followed_up (after event follow-up email)
 * - interested → contacted (after initial outreach)
 * - committed → thanked (after commitment thank you)
 * - executing → recognized (after recognition email)
 */
class StageMovementService {
  
  /**
   * Define stage progression rules
   * Maps: current_stage → next_stage (after email goes out)
   */
  static STAGE_PROGRESSIONS = {
    // Ticketed event pipeline
    'rsvped': 'thanked',
    'paid': 'thanked_paid',
    'attended': 'followed_up',
    
    // Community partners
    'interested': 'contacted',
    'partner': 'thanked',
    
    // Business sponsors
    'sponsor': 'thanked',
    
    // Champions
    'aware': 'contacted',
    'committed': 'thanked',
    'executing': 'recognized'
  };
  
  /**
   * Move contacts to next stage after email sequence completes
   * This gets called after a sequence is sent successfully
   */
  static async moveContactsAfterEmail(sequenceId, contactIds = null) {
    try {
      console.log(`📧 Processing stage movements for sequence ${sequenceId}`);
      
      // Get sequence details to understand context
      const sequence = await prisma.sequence.findUnique({
        where: { id: sequenceId },
        include: {
          campaign: {
            include: {
              contactList: true
            }
          }
        }
      });
      
      if (!sequence) {
        console.log('⚠️ Sequence not found');
        return { moved: 0, skipped: 0 };
      }
      
      // Get all contacts that received this sequence
      const sentContacts = await prisma.sequenceContact.findMany({
        where: {
          sequenceId: sequenceId,
          status: 'sent',
          ...(contactIds ? { contactId: { in: contactIds } } : {})
        },
        include: {
          contact: {
            include: {
              eventAttendees: true
            }
          }
        }
      });
      
      console.log(`🔍 Found ${sentContacts.length} contacts who received this email`);
      
      let movedCount = 0;
      let skippedCount = 0;
      
      // Process each contact
      for (const sentContact of sentContacts) {
        const contact = sentContact.contact;
        
        // Check each event attendee record for this contact
        for (const attendee of contact.eventAttendees) {
          const currentStage = attendee.currentStage;
          const nextStage = this.STAGE_PROGRESSIONS[currentStage];
          
          if (nextStage) {
            // Move to next stage!
            await prisma.eventAttendee.update({
              where: { id: attendee.id },
              data: { 
                currentStage: nextStage,
                updatedAt: new Date()
              }
            });
            
            movedCount++;
            console.log(`✅ Moved ${contact.email} from ${currentStage} → ${nextStage}`);
          } else {
            skippedCount++;
            console.log(`⏭️ No progression rule for stage: ${currentStage} (${contact.email})`);
          }
        }
      }
      
      console.log(`📊 Movement complete: ${movedCount} moved, ${skippedCount} skipped`);
      
      return {
        moved: movedCount,
        skipped: skippedCount,
        total: sentContacts.length
      };
      
    } catch (error) {
      console.error('❌ Error moving contacts:', error);
      throw error;
    }
  }
  
  /**
   * Manually move a single contact to next stage
   */
  static async moveContactManually(eventAttendeeId, toStage = null) {
    try {
      const attendee = await prisma.eventAttendee.findUnique({
        where: { id: eventAttendeeId }
      });
      
      if (!attendee) {
        throw new Error('Event attendee not found');
      }
      
      const currentStage = attendee.currentStage;
      const nextStage = toStage || this.STAGE_PROGRESSIONS[currentStage];
      
      if (!nextStage) {
        throw new Error(`No progression rule for stage: ${currentStage}`);
      }
      
      await prisma.eventAttendee.update({
        where: { id: eventAttendeeId },
        data: { 
          currentStage: nextStage,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Manually moved contact from ${currentStage} → ${nextStage}`);
      
      return {
        from: currentStage,
        to: nextStage
      };
      
    } catch (error) {
      console.error('❌ Error manually moving contact:', error);
      throw error;
    }
  }
  
  /**
   * Bulk move contacts by stage (for campaign-wide movements)
   */
  static async bulkMoveByStage(eventId, fromStage, toStage) {
    try {
      const result = await prisma.eventAttendee.updateMany({
        where: {
          eventId: eventId,
          currentStage: fromStage
        },
        data: {
          currentStage: toStage,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Bulk moved ${result.count} contacts from ${fromStage} → ${toStage}`);
      
      return {
        moved: result.count,
        from: fromStage,
        to: toStage
      };
      
    } catch (error) {
      console.error('❌ Error bulk moving contacts:', error);
      throw error;
    }
  }
  
  /**
   * Preview what would happen if we moved contacts for a sequence
   */
  static async previewMovement(sequenceId) {
    try {
      const sentContacts = await prisma.sequenceContact.findMany({
        where: {
          sequenceId: sequenceId,
          status: 'sent'
        },
        include: {
          contact: {
            include: {
              eventAttendees: true
            }
          }
        }
      });
      
      const preview = [];
      
      for (const sentContact of sentContacts) {
        const contact = sentContact.contact;
        
        for (const attendee of contact.eventAttendees) {
          const currentStage = attendee.currentStage;
          const nextStage = this.STAGE_PROGRESSIONS[currentStage];
          
          preview.push({
            contactEmail: contact.email,
            eventId: attendee.eventId,
            currentStage,
            nextStage: nextStage || 'NO_RULE',
            willMove: !!nextStage
          });
        }
      }
      
      return {
        total: preview.length,
        willMove: preview.filter(p => p.willMove).length,
        wontMove: preview.filter(p => !p.willMove).length,
        preview
      };
      
    } catch (error) {
      console.error('❌ Error previewing movement:', error);
      throw error;
    }
  }
  
  /**
   * Get stage progression map (for UI display)
   */
  static getProgressionMap() {
    return this.STAGE_PROGRESSIONS;
  }
}

export default StageMovementService;

