import express from 'express';
import MetaService from '../services/metaService.js';

const router = express.Router();

/**
 * GET /api/meta/auth-url
 * Get OAuth authorization URL to connect Facebook Page
 */
router.get('/auth-url', async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const authUrl = MetaService.getAuthUrl(orgId);
    
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
 * GET /api/meta/oauth/callback
 * OAuth callback - exchange code for tokens and get pages
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // state contains orgId
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Authorization code and orgId required' });
    }
    
    // Get access token
    const shortLivedToken = await MetaService.getAccessToken(code);
    const userAccessToken = await MetaService.getLongLivedToken(shortLivedToken);
    
    // Get pages
    const pages = await MetaService.getPages(userAccessToken);
    
    // Redirect to frontend with pages data
    const pagesData = encodeURIComponent(JSON.stringify(pages));
    res.redirect(
      `${process.env.FRONTEND_URL}/settings/meta?` +
      `success=true&` +
      `orgId=${state}&` +
      `userToken=${userAccessToken}&` +
      `pages=${pagesData}`
    );
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/meta?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/meta/connect
 * Store Meta credentials for an organization
 */
router.post('/connect', async (req, res) => {
  try {
    const { orgId, userAccessToken, pageId, pageName, pageAccessToken } = req.body;
    
    if (!orgId || !userAccessToken || !pageId || !pageAccessToken) {
      return res.status(400).json({ 
        error: 'orgId, userAccessToken, pageId, and pageAccessToken are required' 
      });
    }
    
    const result = await MetaService.storeCredentials(orgId, {
      userAccessToken,
      pageId,
      pageName,
      pageAccessToken
    });
    
    res.json({
      success: true,
      message: 'Facebook Page connected successfully'
    });
    
  } catch (error) {
    console.error('Error connecting Meta:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/meta/post
 * Create a Facebook post
 */
router.post('/post', async (req, res) => {
  try {
    const { orgId, message, link, imageUrl } = req.body;
    
    if (!orgId || !message) {
      return res.status(400).json({ error: 'orgId and message are required' });
    }
    
    const result = await MetaService.createPost(orgId, {
      message,
      link,
      imageUrl
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/meta/schedule-post
 * Schedule a Facebook post
 */
router.post('/schedule-post', async (req, res) => {
  try {
    const { orgId, message, link, imageUrl, scheduledTime } = req.body;
    
    if (!orgId || !message || !scheduledTime) {
      return res.status(400).json({ error: 'orgId, message, and scheduledTime are required' });
    }
    
    const result = await MetaService.schedulePost(orgId, {
      message,
      link,
      imageUrl,
      scheduledTime
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meta/posts
 * Get Facebook page posts
 */
router.get('/posts', async (req, res) => {
  try {
    const { orgId, limit } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await MetaService.getPosts(orgId, parseInt(limit) || 25);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/meta/post/:postId
 * Delete a Facebook post
 */
router.delete('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await MetaService.deletePost(orgId, postId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meta/insights
 * Get page insights/analytics
 */
router.get('/insights', async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await MetaService.getPageInsights(orgId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/meta/ad-campaign
 * Create a Facebook ad campaign
 */
router.post('/ad-campaign', async (req, res) => {
  try {
    const { orgId, name, objective, status, dailyBudget } = req.body;
    
    if (!orgId || !name || !dailyBudget) {
      return res.status(400).json({ error: 'orgId, name, and dailyBudget are required' });
    }
    
    const result = await MetaService.createAdCampaign(orgId, {
      name,
      objective,
      status,
      dailyBudget
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error creating ad campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/meta/ad-campaign/:campaignId/insights
 * Get ad campaign insights
 */
router.get('/ad-campaign/:campaignId/insights', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    const result = await MetaService.getAdCampaignInsights(orgId, campaignId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error getting ad insights:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

