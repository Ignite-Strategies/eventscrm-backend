import express from 'express';
import { GoogleAdsApi } from 'google-ads-api';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /api/google-ads-hydrate/:accountId
 * 
 * Hydrates Google Ads account data using the saved credentials
 * Returns account overview, campaigns, and performance metrics
 */
router.get('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log('📊 Hydrating Google Ads account:', accountId);
    
    // Get the Google Ads account from database
    const googleAdAccount = await prisma.googleAdAccount.findUnique({
      where: { id: accountId },
      include: {
        googleOAuthConnection: true // Get the auth connection with tokens
      }
    });
    
    console.log('🔍 Found Google Ads account in database:', googleAdAccount);
    
    if (!googleAdAccount) {
      console.log('❌ Google Ads account not found in database for ID:', accountId);
      return res.status(404).json({ error: 'Google Ads account not found' });
    }
    
    if (!googleAdAccount.googleOAuthConnection) {
      console.log('❌ No OAuth connection found for account:', accountId);
      return res.status(404).json({ error: 'OAuth connection not found' });
    }
    
    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: googleAdAccount.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '0sxeRFk29XaMRNU3sVbVLA'
    });
    
    // Create customer client
    const customer = client.Customer({
      customer_id: googleAdAccount.customerId,
      refresh_token: googleAdAccount.googleOAuthConnection.refreshToken
    });
    
    // Fetch account overview
    const accountOverview = await customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.test_account,
        customer.manager,
        customer.auto_tagging_enabled,
        customer.tracking_url_template
      FROM customer
      WHERE customer.id = ${googleAdAccount.customerId}
    `);
    
    // Fetch campaigns
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id DESC
      LIMIT 10
    `);
    
    // Calculate totals
    const totals = campaigns.reduce((acc, campaign) => ({
      impressions: acc.impressions + (campaign.metrics?.impressions || 0),
      clicks: acc.clicks + (campaign.metrics?.clicks || 0),
      cost: acc.cost + (campaign.metrics?.cost_micros || 0) / 1000000, // Convert micros to currency
      conversions: acc.conversions + (campaign.metrics?.conversions || 0)
    }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 });
    
    const response = {
      account: {
        id: accountOverview[0].customer.id,
        name: accountOverview[0].customer.descriptive_name,
        currency: accountOverview[0].customer.currency_code,
        timezone: accountOverview[0].customer.time_zone,
        isTestAccount: accountOverview[0].customer.test_account,
        isManager: accountOverview[0].customer.manager
      },
      campaigns: campaigns.map(c => ({
        id: c.campaign.id,
        name: c.campaign.name,
        status: c.campaign.status,
        type: c.campaign.advertising_channel_type,
        biddingStrategy: c.campaign.bidding_strategy_type,
        startDate: c.campaign.start_date,
        endDate: c.campaign.end_date,
        metrics: {
          impressions: c.metrics?.impressions || 0,
          clicks: c.metrics?.clicks || 0,
          cost: (c.metrics?.cost_micros || 0) / 1000000,
          conversions: c.metrics?.conversions || 0,
          ctr: c.metrics?.ctr || 0,
          averageCpc: (c.metrics?.average_cpc || 0) / 1000000
        }
      })),
      totals: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        spend: totals.cost,
        conversions: totals.conversions,
        averageCtr: totals.clicks > 0 ? (totals.clicks / totals.impressions) : 0,
        campaignCount: campaigns.length
      }
    };
    
    console.log('✅ Google Ads account hydrated:', response.account.name);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error hydrating Google Ads account:', error);
    res.status(500).json({ 
      error: 'Failed to hydrate Google Ads account',
      details: error.message 
    });
  }
});

export default router;

