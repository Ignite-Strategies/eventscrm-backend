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

// OFFICIAL STAGES from EventAttendee.currentStage
export const OFFICIAL_STAGES = [
  'in_funnel',
  'general_awareness',
  'personal_invite',
  'expressed_interest',
  'rsvped',
  'paid',
  'attended'
];

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

// Validate stage
export const isValidStage = (stage) => {
  return OFFICIAL_STAGES.includes(stage) || stage in STAGE_MAPPING;
};

