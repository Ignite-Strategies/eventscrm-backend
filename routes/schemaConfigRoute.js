import express from 'express';

const router = express.Router();

// Audience-specific stage configurations
const AUDIENCE_STAGES = {
  org_members: [
    "aware",           // Know about the event
    "interested",      // Showing interest
    "rsvped",         // Confirmed attendance
    "paid",           // Payment completed
    "attended",       // Actually showed up
    "champion"        // Became an advocate
  ],
  friends_family: [
    "aware",           // Heard about the event
    "interested",      // Thinking about coming
    "rsvped",         // Said they'll come
    "paid",           // Bought ticket
    "attended",       // Actually came
    "champion"        // Telling others about it
  ],
  community_partners: [
    "aware",           // Know about the event
    "interested",      // Considering promotion partnership
    "promoting"        // Agreed to promote us
  ],
  business_sponsor: [
    "aware",           // Know about the event
    "interested",      // Considering sponsorship
    "proposal_sent",   // Sent sponsorship package
    "sponsor_confirmed" // Financial sponsorship confirmed
  ],
  champions: [
    "tentative",       // Tentative about championing
    "champion_agreed"  // Agreed to champion the event
  ]
};

// Get all audience types
router.get('/audience-types', (req, res) => {
  try {
    const audienceTypes = Object.keys(AUDIENCE_STAGES);
    res.json({ success: true, audienceTypes });
  } catch (error) {
    console.error('Error fetching audience types:', error);
    res.status(500).json({ error: 'Failed to fetch audience types' });
  }
});

// Get stages for a specific audience
router.get('/audience-stages/:audienceType', (req, res) => {
  try {
    const { audienceType } = req.params;
    
    if (!AUDIENCE_STAGES[audienceType]) {
      return res.status(400).json({ 
        error: 'Invalid audience type',
        availableTypes: Object.keys(AUDIENCE_STAGES)
      });
    }
    
    const stages = AUDIENCE_STAGES[audienceType];
    res.json({ success: true, audienceType, stages });
  } catch (error) {
    console.error('Error fetching audience stages:', error);
    res.status(500).json({ error: 'Failed to fetch audience stages' });
  }
});

// Get all audience configurations (for frontend hydration)
router.get('/audience-config', (req, res) => {
  try {
    res.json({ success: true, audienceStages: AUDIENCE_STAGES });
  } catch (error) {
    console.error('Error fetching audience config:', error);
    res.status(500).json({ error: 'Failed to fetch audience config' });
  }
});

export default router;