import { GoogleAdsApi, enums } from 'google-ads-api';
import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * Google Ads API Service
 * Manages Google Ads campaigns, keywords, and metrics
 * 
 * Setup Required:
 * 1. Get Google Ads Developer Token: https://developers.google.com/google-ads/api/docs/first-call/dev-token
 * 2. Create OAuth 2.0 credentials in Google Cloud Console
 * 3. Set environment variables in .env
 */
class GoogleAdsService {
  
  /**
   * Initialize Google Ads client
   */
  static getClient(refreshToken = null) {
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    
    if (refreshToken) {
      // Use refresh token for specific customer
      client.useOAuth2({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        refresh_token: refreshToken,
      });
    }
    
    return client;
  }
  
  /**
   * Get OAuth authorization URL
   */
  static getAuthUrl() {
    const client = this.getClient();
    const authUrl = client.getOAuthUrl({
      redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI || 'http://localhost:5001/api/google-ads/oauth/callback',
      scope: 'https://www.googleapis.com/auth/adwords',
    });
    
    return authUrl;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  static async getTokensFromCode(code) {
    const client = this.getClient();
    const tokens = await client.getAccessToken(code, {
      redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI || 'http://localhost:5001/api/google-ads/oauth/callback',
    });
    
    return tokens;
  }
  
  /**
   * Store Google Ads credentials for an organization
   */
  static async storeCredentials(orgId, refreshToken, customerId) {
    // Store in database (you might want a separate GoogleAdsAccount model)
    // For now, we'll use the Organization model with a JSON field
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        // Add a googleAdsConfig JSON field to Organization model
        googleAdsConfig: JSON.stringify({
          refreshToken,
          customerId,
          connectedAt: new Date()
        })
      }
    });
    
    return { success: true };
  }
  
  /**
   * Get stored credentials for an organization
   */
  static async getCredentials(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { googleAdsConfig: true }
    });
    
    if (!org || !org.googleAdsConfig) {
      throw new Error('Google Ads not connected for this organization');
    }
    
    const config = JSON.parse(org.googleAdsConfig);
    return config;
  }
  
  /**
   * Create a new Google Ads campaign
   */
  static async createCampaign(orgId, {
    name,
    budget,
    landingPageUrl,
    adText,
    adHeadline,
    keywords = []
  }) {
    try {
      const credentials = await this.getCredentials(orgId);
      const client = this.getClient(credentials.refreshToken);
      const customer = client.Customer({
        customer_id: credentials.customerId,
        refresh_token: credentials.refreshToken,
      });
      
      // 1. Create budget
      const budgetResourceName = await customer.budgets.create({
        name: `Budget for ${name}`,
        amount_micros: budget * 1000000, // Convert to micros
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      });
      
      // 2. Create campaign
      const campaignResourceName = await customer.campaigns.create({
        name: name,
        status: enums.CampaignStatus.PAUSED, // Start paused
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        campaign_budget: budgetResourceName,
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
        },
      });
      
      // 3. Create ad group
      const adGroupResourceName = await customer.adGroups.create({
        name: `${name} - Ad Group`,
        campaign: campaignResourceName,
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
        cpc_bid_micros: 1000000, // $1 default bid
      });
      
      // 4. Create responsive search ad
      if (adHeadline && adText) {
        await customer.ads.create({
          ad_group: adGroupResourceName,
          status: enums.AdStatus.ENABLED,
          responsive_search_ad: {
            headlines: [
              { text: adHeadline },
              { text: `${adHeadline} - Learn More` },
              { text: name }
            ],
            descriptions: [
              { text: adText },
              { text: 'Click to learn more!' }
            ],
            path1: 'events',
            path2: 'register',
          },
          final_urls: [landingPageUrl],
        });
      }
      
      // 5. Add keywords
      if (keywords.length > 0) {
        const keywordOperations = keywords.map(keyword => ({
          ad_group: adGroupResourceName,
          status: enums.KeywordStatus.ENABLED,
          keyword: {
            text: keyword,
            match_type: enums.KeywordMatchType.BROAD,
          },
        }));
        
        await customer.keywords.create(keywordOperations);
      }
      
      // 6. Save to local database
      const localCampaign = await prisma.adCampaign.create({
        data: {
          orgId,
          name,
          budget,
          landingPage: landingPageUrl,
          adText,
          status: 'Paused',
          googleAdsId: campaignResourceName,
        }
      });
      
      return {
        success: true,
        campaignId: localCampaign.id,
        googleAdsId: campaignResourceName,
        campaign: localCampaign
      };
      
    } catch (error) {
      console.error('❌ Google Ads campaign creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync campaign metrics from Google Ads
   */
  static async syncCampaignMetrics(orgId, localCampaignId) {
    try {
      const credentials = await this.getCredentials(orgId);
      const client = this.getClient(credentials.refreshToken);
      const customer = client.Customer({
        customer_id: credentials.customerId,
        refresh_token: credentials.refreshToken,
      });
      
      // Get local campaign
      const localCampaign = await prisma.adCampaign.findUnique({
        where: { id: localCampaignId }
      });
      
      if (!localCampaign || !localCampaign.googleAdsId) {
        throw new Error('Campaign not found or not linked to Google Ads');
      }
      
      // Query Google Ads for metrics
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM campaign
        WHERE campaign.resource_name = '${localCampaign.googleAdsId}'
      `;
      
      const [campaign] = await customer.query(query);
      
      // Update local database
      const updated = await prisma.adCampaign.update({
        where: { id: localCampaignId },
        data: {
          impressions: campaign.metrics.impressions,
          clicks: campaign.metrics.clicks,
          spend: campaign.metrics.cost_micros / 1000000, // Convert from micros
          status: campaign.campaign.status,
          updatedAt: new Date()
        }
      });
      
      return {
        success: true,
        campaign: updated
      };
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync all campaigns for an organization
   */
  static async syncAllCampaigns(orgId) {
    try {
      const localCampaigns = await prisma.adCampaign.findMany({
        where: {
          orgId,
          googleAdsId: { not: null }
        }
      });
      
      const results = [];
      for (const campaign of localCampaigns) {
        try {
          const result = await this.syncCampaignMetrics(orgId, campaign.id);
          results.push(result);
        } catch (error) {
          console.error(`❌ Failed to sync campaign ${campaign.id}:`, error);
          results.push({ success: false, error: error.message });
        }
      }
      
      return {
        success: true,
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
    } catch (error) {
      console.error('❌ Bulk sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Pause/Resume a campaign
   */
  static async updateCampaignStatus(orgId, localCampaignId, status) {
    try {
      const credentials = await this.getCredentials(orgId);
      const client = this.getClient(credentials.refreshToken);
      const customer = client.Customer({
        customer_id: credentials.customerId,
        refresh_token: credentials.refreshToken,
      });
      
      const localCampaign = await prisma.adCampaign.findUnique({
        where: { id: localCampaignId }
      });
      
      if (!localCampaign || !localCampaign.googleAdsId) {
        throw new Error('Campaign not found or not linked to Google Ads');
      }
      
      // Update Google Ads
      const googleStatus = status === 'Active' 
        ? enums.CampaignStatus.ENABLED 
        : enums.CampaignStatus.PAUSED;
      
      await customer.campaigns.update({
        resource_name: localCampaign.googleAdsId,
        status: googleStatus
      });
      
      // Update local
      const updated = await prisma.adCampaign.update({
        where: { id: localCampaignId },
        data: { status }
      });
      
      return {
        success: true,
        campaign: updated
      };
      
    } catch (error) {
      console.error('❌ Status update failed:', error);
      throw error;
    }
  }
  
  /**
   * Get keyword suggestions for a campaign
   */
  static async getKeywordIdeas(orgId, { seed_keywords, landing_page_url }) {
    try {
      const credentials = await this.getCredentials(orgId);
      const client = this.getClient(credentials.refreshToken);
      const customer = client.Customer({
        customer_id: credentials.customerId,
        refresh_token: credentials.refreshToken,
      });
      
      const ideas = await customer.keywordPlanIdeas.generate({
        language: 'en',
        geo_target_constants: ['geoTargetConstants/2840'], // United States
        keyword_seed: {
          keywords: seed_keywords
        },
        url_seed: landing_page_url ? { url: landing_page_url } : undefined,
      });
      
      return {
        success: true,
        keywords: ideas.map(idea => ({
          text: idea.text,
          avgMonthlySearches: idea.keyword_idea_metrics.avg_monthly_searches,
          competition: idea.keyword_idea_metrics.competition,
          lowBid: idea.keyword_idea_metrics.low_top_of_page_bid_micros / 1000000,
          highBid: idea.keyword_idea_metrics.high_top_of_page_bid_micros / 1000000
        }))
      };
      
    } catch (error) {
      console.error('❌ Keyword ideas failed:', error);
      throw error;
    }
  }
}

export default GoogleAdsService;

