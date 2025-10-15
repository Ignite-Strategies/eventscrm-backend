/**
 * HARDCODED PIPELINE CONFIGURATION
 * Single source of truth for EventAttendee audiences and stages
 * Based on schema.prisma EventAttendee model (THE TRUTH)
 */

// OFFICIAL AUDIENCES from EventAttendee.audienceType
export const OFFICIAL_AUDIENCES = [
  'org_members',
  'friends_family',
  'community_partners',
  'business_sponsor',
  'champions'
];

// ALL POSSIBLE STAGES from EventAttendee.currentStage
export const ALL_STAGES = [
  'in_funnel',
  'general_awareness',
  'personal_invite',
  'expressed_interest',
  'rsvped',
  'thanked',           // Follow-up after RSVP
  'paid',
  'thanked_paid',      // Follow-up after payment
  'attended',
  'followed_up',       // Follow-up after attendance
  'interested',
  'contacted',         // Follow-up after interest
  'partner',
  'sponsor',
  'aware',
  'committed',
  'executing',
  'recognized'         // Follow-up after execution
];

// AUDIENCE-SPECIFIC STAGES
// Each audience type has its own pipeline stages
// FOLLOW-UP STAGES: Every action stage has a follow-up (rsvped → thanked, paid → thanked, attended → followed_up)
export const AUDIENCE_STAGES = {
  'org_members': [
    'in_funnel',
    'general_awareness',
    'personal_invite',
    'expressed_interest',
    'rsvped',
    'thanked',          // Follow-up after RSVP
    'paid',
    'thanked_paid',     // Follow-up after payment
    'attended',
    'followed_up'       // Follow-up after attendance
  ],
  'friends_family': [
    'in_funnel',
    'general_awareness',
    'personal_invite',
    'expressed_interest',
    'rsvped',
    'thanked',          // Follow-up after RSVP
    'paid',
    'thanked_paid',     // Follow-up after payment
    'attended',
    'followed_up'       // Follow-up after attendance
  ],
  'community_partners': [
    'interested',
    'contacted',        // Follow-up after interest
    'partner',
    'thanked',          // Follow-up after partnership
    'recognized'        // Public recognition/social media
  ],
  'business_sponsor': [
    'interested',
    'contacted',        // Follow-up after interest
    'sponsor',
    'thanked',          // Follow-up after sponsorship
    'recognized'        // Public recognition/social media
  ],
  'champions': [
    'aware',
    'contacted',        // Follow-up after awareness
    'committed',
    'thanked',          // Follow-up after commitment
    'executing',
    'recognized'        // Follow-up after execution
  ]
};

// STAGE MAPPING - Maps old/deprecated stages to official stages
export const STAGE_MAPPING = {
  // Old stages → New stages
  'soft_commit': 'rsvped',
  'rsvp': 'rsvped',
  'sop_entry': 'in_funnel',
  'aware': 'general_awareness',
  'interested': 'expressed_interest',
  // Official stages (no mapping needed)
  'in_funnel': 'in_funnel',
  'general_awareness': 'general_awareness',
  'personal_invite': 'personal_invite',
  'expressed_interest': 'expressed_interest',
  'rsvped': 'rsvped',
  'paid': 'paid',
  'attended': 'attended'
};

// Helper function to map stage to official stage
export const mapToOfficialStage = (stage) => {
  return STAGE_MAPPING[stage] || 'in_funnel'; // Default to in_funnel if unknown
};

// Validate audience type
export const isValidAudience = (audienceType) => {
  return OFFICIAL_AUDIENCES.includes(audienceType);
};

// Get stages for specific audience
export const getStagesForAudience = (audienceType) => {
  return AUDIENCE_STAGES[audienceType] || [];
};

// Validate stage for audience
export const isValidStageForAudience = (stage, audienceType) => {
  const audienceStages = getStagesForAudience(audienceType);
  return audienceStages.includes(stage);
};

