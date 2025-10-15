import axios from 'axios';
import { getPrismaClient } from "../config/database.js";

const prisma = getPrismaClient();

/**
 * Meta (Facebook) Business Service
 * Manages Facebook Pages, Posts, and Ads
 * 
 * Setup Required:
 * 1. Create Meta/Facebook App: https://developers.facebook.com
 * 2. Add Facebook Login and Pages API products
 * 3. Request pages_show_list, pages_read_engagement, pages_manage_posts permissions
 * 4. For ads: ads_management, ads_read permissions
 * 5. Set environment variables in .env
 */
class MetaService {
  
  static GRAPH_API_VERSION = 'v18.0';
  static BASE_URL = `https://graph.facebook.com/${this.GRAPH_API_VERSION}`;
  
  /**
   * Get OAuth authorization URL
   */
  static getAuthUrl(orgId) {
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:5001/api/meta/oauth/callback';
    
    const permissions = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_engagement',
      'business_management',
      'read_insights'
    ].join(',');
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${orgId}` +
      `&scope=${permissions}`;
    
    return authUrl;
  }
  
  /**
   * Exchange authorization code for access token
   */
  static async getAccessToken(code) {
    try {
      const response = await axios.get(`${this.BASE_URL}/oauth/access_token`, {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI || 'http://localhost:5001/api/meta/oauth/callback',
          code: code
        }
      });
      
      return response.data.access_token;
      
    } catch (error) {
      console.error('❌ Meta token exchange failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get long-lived user access token (60 days)
   */
  static async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${this.BASE_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: shortLivedToken
        }
      });
      
      return response.data.access_token;
      
    } catch (error) {
      console.error('❌ Long-lived token exchange failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get pages managed by user
   */
  static async getPages(userAccessToken) {
    try {
      const response = await axios.get(`${this.BASE_URL}/me/accounts`, {
        params: {
          access_token: userAccessToken
        }
      });
      
      return response.data.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token, // Page access token (never expires!)
        category: page.category,
        tasks: page.tasks
      }));
      
    } catch (error) {
      console.error('❌ Get pages failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Store Meta credentials for an organization
   */
  static async storeCredentials(orgId, { userAccessToken, pageId, pageName, pageAccessToken }) {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        metaConfig: JSON.stringify({
          userAccessToken,
          pageId,
          pageName,
          pageAccessToken,
          connectedAt: new Date()
        })
      }
    });
    
    return { success: true };
  }
  
  /**
   * Get stored Meta credentials
   */
  static async getCredentials(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { metaConfig: true }
    });
    
    if (!org || !org.metaConfig) {
      throw new Error('Meta/Facebook not connected for this organization');
    }
    
    const config = JSON.parse(org.metaConfig);
    return config;
  }
  
  /**
   * Create a Facebook post
   */
  static async createPost(orgId, { message, link, imageUrl }) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageId, pageAccessToken } = credentials;
      
      const postData = {
        message: message,
        access_token: pageAccessToken
      };
      
      if (link) {
        postData.link = link;
      }
      
      // If image URL provided, upload photo first
      if (imageUrl) {
        const photoResponse = await axios.post(
          `${this.BASE_URL}/${pageId}/photos`,
          {
            url: imageUrl,
            caption: message,
            access_token: pageAccessToken
          }
        );
        
        return {
          success: true,
          postId: photoResponse.data.id,
          type: 'photo'
        };
      }
      
      // Regular post
      const response = await axios.post(
        `${this.BASE_URL}/${pageId}/feed`,
        postData
      );
      
      return {
        success: true,
        postId: response.data.id,
        type: 'post'
      };
      
    } catch (error) {
      console.error('❌ Create post failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get page posts
   */
  static async getPosts(orgId, limit = 25) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageId, pageAccessToken } = credentials;
      
      const response = await axios.get(`${this.BASE_URL}/${pageId}/posts`, {
        params: {
          fields: 'id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares',
          access_token: pageAccessToken,
          limit
        }
      });
      
      return {
        success: true,
        posts: response.data.data.map(post => ({
          id: post.id,
          message: post.message,
          createdAt: post.created_time,
          url: post.permalink_url,
          likes: post.reactions?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0
        }))
      };
      
    } catch (error) {
      console.error('❌ Get posts failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get page insights (analytics)
   */
  static async getPageInsights(orgId, metrics = ['page_impressions', 'page_engaged_users', 'page_followers_count']) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageId, pageAccessToken } = credentials;
      
      const response = await axios.get(`${this.BASE_URL}/${pageId}/insights`, {
        params: {
          metric: metrics.join(','),
          access_token: pageAccessToken,
          period: 'day',
          since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Last 7 days
          until: Math.floor(Date.now() / 1000)
        }
      });
      
      return {
        success: true,
        insights: response.data.data
      };
      
    } catch (error) {
      console.error('❌ Get insights failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Create Facebook Ad Campaign
   */
  static async createAdCampaign(orgId, {
    name,
    objective = 'OUTCOME_TRAFFIC',
    status = 'PAUSED',
    dailyBudget
  }) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { adAccountId, pageAccessToken } = credentials;
      
      if (!adAccountId) {
        throw new Error('Ad Account not configured. Please set up Meta Ads Manager first.');
      }
      
      // Create campaign
      const response = await axios.post(
        `${this.BASE_URL}/act_${adAccountId}/campaigns`,
        {
          name,
          objective,
          status,
          daily_budget: dailyBudget * 100, // Convert to cents
          access_token: pageAccessToken
        }
      );
      
      // Save to local database
      const localCampaign = await prisma.adCampaign.create({
        data: {
          orgId,
          name,
          budget: dailyBudget,
          landingPage: '',
          adText: '',
          status: status === 'ACTIVE' ? 'Active' : 'Paused',
          metaAdsId: response.data.id,
          platform: 'Meta'
        }
      });
      
      return {
        success: true,
        campaignId: localCampaign.id,
        metaAdsId: response.data.id,
        campaign: localCampaign
      };
      
    } catch (error) {
      console.error('❌ Create ad campaign failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get ad campaign insights
   */
  static async getAdCampaignInsights(orgId, localCampaignId) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageAccessToken } = credentials;
      
      const localCampaign = await prisma.adCampaign.findUnique({
        where: { id: localCampaignId }
      });
      
      if (!localCampaign || !localCampaign.metaAdsId) {
        throw new Error('Campaign not found or not linked to Meta');
      }
      
      const response = await axios.get(
        `${this.BASE_URL}/${localCampaign.metaAdsId}/insights`,
        {
          params: {
            fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc',
            access_token: pageAccessToken
          }
        }
      );
      
      const insights = response.data.data[0];
      
      // Update local database
      if (insights) {
        await prisma.adCampaign.update({
          where: { id: localCampaignId },
          data: {
            impressions: parseInt(insights.impressions) || 0,
            clicks: parseInt(insights.clicks) || 0,
            spend: parseFloat(insights.spend) || 0
          }
        });
      }
      
      return {
        success: true,
        insights
      };
      
    } catch (error) {
      console.error('❌ Get ad insights failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Schedule a post
   */
  static async schedulePost(orgId, { message, link, imageUrl, scheduledTime }) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageId, pageAccessToken } = credentials;
      
      const postData = {
        message: message,
        published: false,
        scheduled_publish_time: Math.floor(new Date(scheduledTime).getTime() / 1000),
        access_token: pageAccessToken
      };
      
      if (link) {
        postData.link = link;
      }
      
      const response = await axios.post(
        `${this.BASE_URL}/${pageId}/feed`,
        postData
      );
      
      return {
        success: true,
        postId: response.data.id,
        scheduledFor: scheduledTime
      };
      
    } catch (error) {
      console.error('❌ Schedule post failed:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Delete a post
   */
  static async deletePost(orgId, postId) {
    try {
      const credentials = await this.getCredentials(orgId);
      const { pageAccessToken } = credentials;
      
      await axios.delete(`${this.BASE_URL}/${postId}`, {
        params: {
          access_token: pageAccessToken
        }
      });
      
      return {
        success: true,
        message: 'Post deleted'
      };
      
    } catch (error) {
      console.error('❌ Delete post failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default MetaService;

