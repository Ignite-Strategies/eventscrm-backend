import { getPrismaClient } from "../config/database.js";
import { mapToOfficialStage, OFFICIAL_AUDIENCES, AUDIENCE_STAGES, isValidStageForAudience } from "../config/pipelineConfig.js";

const prisma = getPrismaClient();

/**
 * Pipeline Stage Determiner Service
 * Determines the correct pipeline stage based on EventAttendee data and form responses
 */
class PipelineStageDeterminerService {

  /**
   * Determine stage from form response data
   * Maps form responses to appropriate pipeline stages
   */
  static async determineStageFromFormData(formData, audienceType = 'org_members') {
    console.log('🔍 STAGE DETERMINER: Analyzing form data for audience:', audienceType);
    
    // Extract likelihood response
    const likelihoodString = formData.how_likely_to_attend 
      || formData.likelihood_to_attend
      || formData.likelihood
      || formData.attendance_likelihood;
    
    // Extract payment status
    const paymentStatus = formData.payment_status
      || formData.paid
      || formData.payment_complete;
    
    // Extract RSVP status
    const rsvpStatus = formData.rsvp_status
      || formData.rsvp
      || formData.confirmed;
    
    // Extract invitation source
    const invitationSource = formData.invitation_source
      || formData.how_did_you_hear
      || formData.source;
    
    console.log('📊 STAGE DETERMINER: Extracted values:', {
      likelihoodString,
      paymentStatus,
      rsvpStatus,
      invitationSource
    });
    
    // Determine stage based on data
    let determinedStage = 'in_funnel'; // Default fallback
    
    // 1. Check payment status first (highest priority)
    if (paymentStatus === 'paid' || paymentStatus === 'complete' || paymentStatus === true) {
      determinedStage = 'paid';
    }
    // 2. Check RSVP status
    else if (rsvpStatus === 'yes' || rsvpStatus === 'confirmed' || rsvpStatus === true) {
      determinedStage = 'rsvped';
    }
    // 3. Analyze likelihood response
    else if (likelihoodString) {
      determinedStage = this.analyzeLikelihoodResponse(likelihoodString);
    }
    // 4. Check invitation source for initial stages
    else if (invitationSource) {
      determinedStage = this.analyzeInvitationSource(invitationSource);
    }
    
    // Validate stage for audience
    const validStages = AUDIENCE_STAGES[audienceType] || AUDIENCE_STAGES['org_members'];
    if (!validStages.includes(determinedStage)) {
      console.log('⚠️ STAGE DETERMINER: Invalid stage for audience, using fallback');
      determinedStage = validStages[0] || 'in_funnel';
    }
    
    // Map to official stage name
    const officialStage = mapToOfficialStage(determinedStage);
    
    console.log('✅ STAGE DETERMINER: Determined stage:', officialStage);
    return officialStage;
  }
  
  /**
   * Analyze likelihood response text to determine stage
   */
  static analyzeLikelihoodResponse(likelihoodString) {
    const lowerResponse = likelihoodString.toLowerCase();
    
    // High commitment responses → rsvped
    if (lowerResponse.includes("i'm in") || 
        lowerResponse.includes("planning to be there") ||
        lowerResponse.includes("definitely") ||
        lowerResponse.includes("for sure") ||
        lowerResponse.includes("count me in")) {
      return 'rsvped';
    }
    
    // Medium commitment responses → expressed_interest
    if (lowerResponse.includes("most likely") ||
        lowerResponse.includes("probably yes") ||
        lowerResponse.includes("confirming logistics") ||
        lowerResponse.includes("probably") ||
        lowerResponse.includes("likely")) {
      return 'expressed_interest';
    }
    
    // Low commitment responses → general_awareness
    if (lowerResponse.includes("maybe") ||
        lowerResponse.includes("possibly") ||
        lowerResponse.includes("not sure") ||
        lowerResponse.includes("depends") ||
        lowerResponse.includes("morale support")) {
      return 'general_awareness';
    }
    
    // Default to expressed_interest for any response
    return 'expressed_interest';
  }
  
  /**
   * Analyze invitation source to determine initial stage
   */
  static analyzeInvitationSource(source) {
    const lowerSource = source.toLowerCase();
    
    // Direct personal invitations → personal_invite
    if (lowerSource.includes("personal") ||
        lowerSource.includes("direct") ||
        lowerSource.includes("friend") ||
        lowerSource.includes("colleague")) {
      return 'personal_invite';
    }
    
    // General awareness sources → general_awareness
    if (lowerSource.includes("social media") ||
        lowerSource.includes("website") ||
        lowerSource.includes("email") ||
        lowerSource.includes("newsletter")) {
      return 'general_awareness';
    }
    
    // Default to general_awareness
    return 'general_awareness';
  }
  
  /**
   * Determine stage from existing EventAttendee data
   * Useful for re-evaluating existing records
   */
  static async determineStageFromEventAttendee(eventAttendeeId) {
    console.log('🔍 STAGE DETERMINER: Analyzing EventAttendee:', eventAttendeeId);
    
    const eventAttendee = await prisma.eventAttendee.findUnique({
      where: { id: eventAttendeeId },
      include: {
        contact: true,
        event: true,
        likelihoodToAttend: true
      }
    });
    
    if (!eventAttendee) {
      throw new Error('EventAttendee not found');
    }
    
    // Check if they've paid
    if (eventAttendee.paymentStatus === 'paid' || eventAttendee.paid === true) {
      return 'paid';
    }
    
    // Check likelihood to attend
    if (eventAttendee.likelihoodToAttend) {
      const likelihoodValue = eventAttendee.likelihoodToAttend.value;
      
      if (likelihoodValue === 1) {
        return 'rsvped'; // "I'm in"
      } else if (likelihoodValue === 2) {
        return 'expressed_interest'; // "Most likely"
      } else if (likelihoodValue === 3) {
        return 'general_awareness'; // "Maybe"
      } else if (likelihoodValue === 4) {
        return 'general_awareness'; // "Support from afar"
      }
    }
    
    // Check notes for additional context
    if (eventAttendee.notes && typeof eventAttendee.notes === 'object') {
      const notes = eventAttendee.notes;
      
      // Look for payment indicators in notes
      if (notes.payment_status === 'paid' || notes.paid === true) {
        return 'paid';
      }
      
      // Look for RSVP indicators in notes
      if (notes.rsvp_status === 'yes' || notes.confirmed === true) {
        return 'rsvped';
      }
    }
    
    // Default based on current stage or fallback
    return eventAttendee.currentStage || 'in_funnel';
  }
  
  /**
   * Bulk determine stages for multiple EventAttendees
   */
  static async bulkDetermineStages(eventAttendeeIds) {
    console.log('🔍 STAGE DETERMINER: Bulk analyzing', eventAttendeeIds.length, 'attendees');
    
    const results = [];
    
    for (const attendeeId of eventAttendeeIds) {
      try {
        const determinedStage = await this.determineStageFromEventAttendee(attendeeId);
        
        // Update the EventAttendee with the determined stage
        await prisma.eventAttendee.update({
          where: { id: attendeeId },
          data: { currentStage: determinedStage }
        });
        
        results.push({
          attendeeId,
          determinedStage,
          success: true
        });
        
        console.log('✅ STAGE DETERMINER: Updated attendee', attendeeId, 'to stage', determinedStage);
        
      } catch (error) {
        console.error('❌ STAGE DETERMINER: Error processing attendee', attendeeId, ':', error.message);
        results.push({
          attendeeId,
          error: error.message,
          success: false
        });
      }
    }
    
    console.log('✅ STAGE DETERMINER: Bulk analysis complete:', results.length, 'processed');
    return results;
  }
  
  /**
   * Get stage progression for an audience type
   * Returns the logical progression of stages
   */
  static getStageProgression(audienceType = 'org_members') {
    const stages = AUDIENCE_STAGES[audienceType] || AUDIENCE_STAGES['org_members'];
    
    // Define the logical progression
    const progression = [
      'in_funnel',           // Initial entry
      'general_awareness',   // Basic awareness
      'personal_invite',     // Direct invitation
      'expressed_interest',  // Showed interest
      'rsvped',             // Confirmed attendance
      'paid',               // Payment complete
      'attended'            // Actually attended
    ];
    
    // Filter to only include stages valid for this audience
    return progression.filter(stage => stages.includes(stage));
  }
  
  /**
   * Get next logical stage in progression
   */
  static getNextStage(currentStage, audienceType = 'org_members') {
    const progression = this.getStageProgression(audienceType);
    const currentIndex = progression.indexOf(currentStage);
    
    if (currentIndex === -1 || currentIndex === progression.length - 1) {
      return null; // No next stage
    }
    
    return progression[currentIndex + 1];
  }
  
  /**
   * Get previous logical stage in progression
   */
  static getPreviousStage(currentStage, audienceType = 'org_members') {
    const progression = this.getStageProgression(audienceType);
    const currentIndex = progression.indexOf(currentStage);
    
    if (currentIndex <= 0) {
      return null; // No previous stage
    }
    
    return progression[currentIndex - 1];
  }
}

export default PipelineStageDeterminerService;
