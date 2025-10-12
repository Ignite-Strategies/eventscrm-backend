import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Desired display order
const AUDIENCE_ORDER = [
  'org_members',
  'champions', 
  'friends_family',
  'community_partners',
  'business_sponsor'
];

/**
 * GET /api/pipeline-config
 * Returns all pipeline configs in correct order
 */
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.pipelineEventConfig.findMany();
    
    // Sort by desired order
    const sorted = AUDIENCE_ORDER
      .map(type => configs.find(c => c.audienceType === type))
      .filter(Boolean); // Remove any missing configs
    
    console.log('📊 Returning pipeline configs:', sorted.length);
    
    res.json(sorted);
  } catch (error) {
    console.error('❌ Error fetching pipeline configs:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline configs' });
  }
});

/**
 * GET /api/pipeline-config/:audienceType
 * Returns stages for specific audience
 */
router.get('/:audienceType', async (req, res) => {
  try {
    const { audienceType } = req.params;
    
    const config = await prisma.pipelineEventConfig.findUnique({
      where: { audienceType }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Pipeline config not found for this audience' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('❌ Error fetching pipeline config:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline config' });
  }
});

/**
 * PUT /api/pipeline-config/:audienceType
 * Update stages for specific audience
 */
router.put('/:audienceType', async (req, res) => {
  try {
    const { audienceType } = req.params;
    const { stages } = req.body;
    
    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: 'stages must be an array' });
    }
    
    const config = await prisma.pipelineEventConfig.update({
      where: { audienceType },
      data: { stages }
    });
    
    console.log('✅ Updated pipeline config for', audienceType);
    
    res.json(config);
  } catch (error) {
    console.error('❌ Error updating pipeline config:', error);
    res.status(500).json({ error: 'Failed to update pipeline config' });
  }
});

export default router;

