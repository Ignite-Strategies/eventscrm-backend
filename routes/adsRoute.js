import express from 'express';
import {
  createAdCampaign,
  getAdCampaigns,
  getAdSummary,
  updateAdMetrics,
  updateAdStatus,
  getAdCampaignById,
  deleteAdCampaign
} from '../services/adsService.js';

const router = express.Router();

/**
 * POST /api/ads/create
 * Create a new ad campaign
 */
router.post('/create', async (req, res) => {
  try {
    const { orgId, name, budget, landingPage, adText } = req.body;

    if (!orgId || !name || !budget || !landingPage || !adText) {
      return res.status(400).json({ 
        error: 'Missing required fields: orgId, name, budget, landingPage, adText' 
      });
    }

    const campaign = await createAdCampaign(orgId, {
      name,
      budget,
      landingPage,
      adText
    });

    res.json({
      success: true,
      campaignId: campaign.id,
      campaign
    });
  } catch (error) {
    console.error('Error creating ad campaign:', error);
    res.status(500).json({ error: 'Failed to create ad campaign' });
  }
});

/**
 * GET /api/ads/summary
 * Get summary metrics for all ad campaigns
 */
router.get('/summary', async (req, res) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Missing required query parameter: orgId' });
    }

    const summary = await getAdSummary(orgId);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching ad summary:', error);
    res.status(500).json({ error: 'Failed to fetch ad summary' });
  }
});

/**
 * GET /api/ads/list
 * Get all ad campaigns for an organization
 */
router.get('/list', async (req, res) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: 'Missing required query parameter: orgId' });
    }

    const campaigns = await getAdCampaigns(orgId);

    res.json({
      campaigns,
      total: campaigns.length
    });
  } catch (error) {
    console.error('Error fetching ad campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch ad campaigns' });
  }
});

/**
 * GET /api/ads/:campaignId
 * Get a single ad campaign by ID
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await getAdCampaignById(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching ad campaign:', error);
    res.status(500).json({ error: 'Failed to fetch ad campaign' });
  }
});

/**
 * PATCH /api/ads/:campaignId/metrics
 * Update ad campaign metrics (impressions, clicks, spend)
 */
router.patch('/:campaignId/metrics', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { impressions, clicks, spend } = req.body;

    const campaign = await updateAdMetrics(campaignId, {
      impressions,
      clicks,
      spend
    });

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error updating ad metrics:', error);
    res.status(500).json({ error: 'Failed to update ad metrics' });
  }
});

/**
 * PATCH /api/ads/:campaignId/status
 * Update ad campaign status
 */
router.patch('/:campaignId/status', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    const campaign = await updateAdStatus(campaignId, status);

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error updating ad status:', error);
    res.status(500).json({ error: 'Failed to update ad status' });
  }
});

/**
 * DELETE /api/ads/:campaignId
 * Delete an ad campaign
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    await deleteAdCampaign(campaignId);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ad campaign:', error);
    res.status(500).json({ error: 'Failed to delete ad campaign' });
  }
});

export default router;

