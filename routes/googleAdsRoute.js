import express from 'express';
import GoogleAdsService from '../services/googleAdsService.js';

const router = express.Router();

/**
 * GET /api/google-ads/auth-url
 * Get OAuth authorization URL to connect Google Ads
 */
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = GoogleAdsService.getAuthUrl();
    
    res.json({
      success: true,
      authUrl
    });
    
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/google-ads/oauth/callback
 * OAuth callback - exchange code for tokens
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // state should contain orgId
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    const tokens = await GoogleAdsService.getTokensFromCode(code);
    
    // In production, you'd decode state to get orgId and customerId
    // For now, redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/settings/google-ads?success=true`);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/google-ads?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/google-ads/connect
 * Store Google Ads credentials for an organization
 */
router.post('/connect', async (req, res) => {
  try {
    const { orgId, refreshToken, customerId } = req.body;
    
    if (!orgId || !refreshToken || !customerId) {
      return res.status(400).json({ 
        error: 'orgId, refreshToken, and customerId are required' 
      });
    }
    
    const result = await GoogleAdsService.storeCredentials(orgId, refreshToken, customerId);
    
    res.json({
      success: true,
      message: 'Google Ads connected successfully'
    });
    
  } catch (error) {
    console.error('Error connecting Google Ads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-ads/create-campaign
 * Create a new Google Ads campaign
 */
router.post('/create-campaign', async (req, res) => {
  try {
    const { orgId, name, budget, landingPageUrl, adText, adHeadline, keywords } = req.body;
    
    if (!orgId || !name || !budget || !landingPageUrl) {
      return res.status(400).json({ 
        error: 'orgId, name, budget, and landingPageUrl are required' 
      });
    }
    
    const result = await GoogleAdsService.createCampaign(orgId, {
      name,
      budget,
      landingPageUrl,
      adText,
      adHeadline,
      keywords
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-ads/sync/:campaignId
 * Sync metrics for a specific campaign
 */
router.post('/sync/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await GoogleAdsService.syncCampaignMetrics(orgId, campaignId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error syncing campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-ads/sync-all
 * Sync all campaigns for an organization
 */
router.post('/sync-all', async (req, res) => {
  try {
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await GoogleAdsService.syncAllCampaigns(orgId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error syncing campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/google-ads/campaign/:campaignId/status
 * Update campaign status (pause/resume)
 */
router.patch('/campaign/:campaignId/status', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { orgId, status } = req.body;
    
    if (!orgId || !status) {
      return res.status(400).json({ error: 'orgId and status are required' });
    }
    
    const result = await GoogleAdsService.updateCampaignStatus(orgId, campaignId, status);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-ads/keyword-ideas
 * Get keyword suggestions
 */
router.post('/keyword-ideas', async (req, res) => {
  try {
    const { orgId, seed_keywords, landing_page_url } = req.body;
    
    if (!orgId || !seed_keywords) {
      return res.status(400).json({ error: 'orgId and seed_keywords are required' });
    }
    
    const result = await GoogleAdsService.getKeywordIdeas(orgId, {
      seed_keywords,
      landing_page_url
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting keyword ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

