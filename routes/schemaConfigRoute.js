import express from 'express';

const router = express.Router();

/**
 * UNIVERSAL EVENT ATTENDEE STAGES
 * These are the ACTUAL stages in the EventAttendee model
 * NOT hardcoded - these match the schema!
 */
const EVENT_ATTENDEE_STAGES = [
  "in_funnel",           // Initial contact, not yet engaged
  "general_awareness",   // Aware of the event
  "personal_invite",     // Personally invited
  "expressed_interest",  // Showed interest
  "rsvp",                // Confirmed attendance (soft commit)
  "paid",                // Payment completed
  "attended",            // Actually showed up
  "cant_attend"          // Can't make it
];

/**
 * UNIVERSAL AUDIENCE TYPES
 * These are the ACTUAL audience types in the EventAttendee model
 */
const AUDIENCE_TYPES = [
  "org_members",         // Internal team members
  "friends_family",      // Personal network
  "landing_page_public", // Public signups from landing page
  "community_partners",  // Partner organizations
  "cold_outreach"        // Cold prospects
];

/**
 * GET /api/schema/event-attendee
 * Returns the UNIVERSAL schema config for EventAttendee
 * This is what the frontend should use to hydrate dropdowns!
 */
router.get('/event-attendee', (req, res) => {
  try {
    res.json({
      audienceTypes: AUDIENCE_TYPES,
      stages: EVENT_ATTENDEE_STAGES
    });
  } catch (error) {
    console.error('Error fetching event-attendee schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// Legacy route for backward compatibility
router.get('/audience-types', (req, res) => {
  try {
    res.json({ success: true, audienceTypes: AUDIENCE_TYPES });
  } catch (error) {
    console.error('Error fetching audience types:', error);
    res.status(500).json({ error: 'Failed to fetch audience types' });
  }
});

// Legacy route for backward compatibility
router.get('/audience-config', (req, res) => {
  try {
    res.json({ 
      success: true, 
      audienceTypes: AUDIENCE_TYPES,
      stages: EVENT_ATTENDEE_STAGES
    });
  } catch (error) {
    console.error('Error fetching audience config:', error);
    res.status(500).json({ error: 'Failed to fetch audience config' });
  }
});

export default router;