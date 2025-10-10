import express from 'express';

const router = express.Router();

/**
 * GET /api/schema/event-attendee
 * Returns the valid values for EventAttendee fields from the schema
 */
router.get('/event-attendee', async (req, res) => {
  try {
    res.json({
      audienceTypes: [
        'org_members',
        'friends_family',
        'landing_page_public',
        'community_partners',
        'cold_outreach'
      ],
      stages: [
        'in_funnel',
        'general_awareness',
        'personal_invite',
        'expressed_interest',
        'soft_commit',
        'paid'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

