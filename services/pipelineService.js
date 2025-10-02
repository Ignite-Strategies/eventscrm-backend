/**
 * Pipeline Rules Engine
 * Handles automatic stage transitions and champion flagging
 */

/**
 * Apply intake rules when a contact enters an event
 */
export function applyIntakeRules({ membership, event, intakeSource, formPayload = {} }) {
  const rules = event.pipelineRules || {};
  
  // SOP entry - first touch automation
  if (rules.autoSopOnIntake && rules.sopTriggers?.includes(intakeSource)) {
    membership.stage = "sop_entry";
    
    // Add source tag if not present
    const sourceTag = `source:${intakeSource}`;
    if (!membership.tags?.includes(sourceTag)) {
      membership.tags = [...(membership.tags || []), sourceTag];
    }
  }
  
  // RSVP - expressed intent
  if (rules.rsvpTriggers?.includes(intakeSource) || formPayload.rsvp === true) {
    membership.stage = "rsvp";
    membership.rsvp = true;
  }
  
  // Champion check
  membership.champion = shouldMarkChampion(membership, rules.championCriteria);
  
  // Add audit tag
  const auditTag = `rule:auto_${membership.stage}@${new Date().toISOString().split('T')[0]}`;
  membership.tags = [...(membership.tags || []), auditTag];
  
  return membership;
}

/**
 * Determine if a contact should be marked as champion
 */
export function shouldMarkChampion(membership, criteria = {}) {
  const scoreOK = (membership.engagementScore || 0) >= (criteria.minEngagement ?? 3);
  const tagHit = (criteria.tagsAny || []).some(t => (membership.tags || []).includes(t));
  return scoreOK || tagHit || false;
}

/**
 * Apply paid status (called from payment webhook)
 */
export function applyPaid(membership, amount) {
  membership.paid = true;
  membership.amount = amount;
  membership.stage = "paid";
  membership.engagementScore = (membership.engagementScore || 0) + 2;
  
  // Add audit tag
  const auditTag = `rule:auto_paid@${new Date().toISOString().split('T')[0]}`;
  membership.tags = [...(membership.tags || []), auditTag];
  
  return membership;
}

/**
 * Apply attended status (post-event reconciliation)
 */
export function applyAttended(membership) {
  membership.stage = "attended";
  membership.engagementScore = (membership.engagementScore || 0) + 1;
  
  // Add audit tag
  const auditTag = `rule:attended@${new Date().toISOString().split('T')[0]}`;
  membership.tags = [...(membership.tags || []), auditTag];
  
  return membership;
}

/**
 * Manual champion override
 */
export function markAsChampion(membership, manualNote = "") {
  membership.champion = true;
  membership.engagementScore = Math.max(membership.engagementScore || 0, 5);
  
  const auditTag = manualNote 
    ? `champion:manual:${manualNote}` 
    : `champion:manual@${new Date().toISOString().split('T')[0]}`;
  membership.tags = [...(membership.tags || []), auditTag];
  
  return membership;
}

