import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// OFFICIAL STAGES - Single source of truth (matches schema.prisma pipelineDefaults)
// These MUST match what's actually in EventAttendee.currentStage in the database!
const OFFICIAL_STAGES = [
  'in_funnel',
  'general_awareness',
  'personal_invite',
  'expressed_interest',
  'rsvped',
  'paid',
  'attended'
];

// OFFICIAL AUDIENCE TYPES - Single source of truth
const OFFICIAL_AUDIENCES = [
  'org_members',
  'friends_family',
  'landing_page_public',
  'community_partners',
  'cold_outreach'
];

/**
 * GET /api/schema/event-attendee
 * Returns OFFICIAL schema config (not dynamic from data)
 * This is the single source of truth!
 */
router.get('/event-attendee', async (req, res) => {
  try {
    res.json({
      audienceTypes: OFFICIAL_AUDIENCES,
      stages: OFFICIAL_STAGES
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

/**
 * GET /api/schema/audience-stages/:audienceType
 * Returns official stages for a specific audience type
 * All audiences use the same stages
 */
router.get('/audience-stages/:audienceType', async (req, res) => {
  try {
    const { audienceType } = req.params;
    
    // Validate audience type
    if (!OFFICIAL_AUDIENCES.includes(audienceType)) {
      return res.status(400).json({ 
        error: 'Invalid audience type',
        validTypes: OFFICIAL_AUDIENCES 
      });
    }
    
    res.json({ 
      success: true, 
      audienceType,
      stages: OFFICIAL_STAGES
    });
  } catch (error) {
    console.error('Error fetching audience stages:', error);
    res.status(500).json({ error: 'Failed to fetch audience stages' });
  }
});

export default router;