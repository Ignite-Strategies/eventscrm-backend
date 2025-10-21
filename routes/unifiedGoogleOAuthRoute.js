/**
 * 🧭 Unified Google OAuth Handler (EngageSmart)
 * Single callback endpoint for ALL Google services (Gmail, YouTube, Ads)
 */

import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { google } from 'googleapis';
import { createId } from '@paralleldrive/cuid2';
import { getScopesForService } from '../config/oauthScopes.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 🔐 Initiate OAuth for any Google service
 * GET /api/google-oauth/auth?service=gmail&orgId=xxx&adminId=xxx
 */
router.get('/auth', (req, res) => {
  const { service, orgId, adminId } = req.query;
  
  // Validate required parameters
  if (!service || !orgId || !adminId) {
    return res.status(400).json({ 
      error: 'service, orgId, and adminId are required',
      validServices: ['gmail', 'youtube', 'ads']
    });
  }
  
  // Validate service
  const validServices = ['gmail', 'youtube', 'ads'];
  if (!validServices.includes(service)) {
    return res.status(400).json({ 
      error: `Invalid service: ${service}`,
      validServices 
    });
  }
  
  console.log(`🚀 Initiating ${service.toUpperCase()} OAuth for org: ${orgId}, admin: ${adminId}`);
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://app.engage-smart.com/oauth/callback"
  );

  // Get scopes for the specific service
  const serviceScopes = getScopesForService(service.toUpperCase());
  const baseScopes = ['openid', 'email', 'profile']; // Always include these
  const allScopes = [...serviceScopes, ...baseScopes];
  
  // Create state parameter with service info
  const state = Buffer.from(JSON.stringify({ 
    service, 
    orgId, 
    adminId 
  })).toString('base64');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: allScopes,
    prompt: 'consent',
    state: state
  });

  console.log(`🔗 Generated ${service.toUpperCase()} OAuth URL`);
  res.json({ 
    authUrl,
    service,
    scopes: allScopes
  });
});

/**
 * 🔄 Unified OAuth Callback Handler
 * POST /api/google-oauth/callback
 * Handles ALL Google services based on state parameter
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }
    
    // Decode state to get service info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
    
    const { service, orgId, adminId } = stateData;
    
    if (!service || !orgId || !adminId) {
      throw new Error('Missing service, orgId, or adminId in state');
    }
    
    console.log(`🔄 Processing ${service.toUpperCase()} OAuth callback for org: ${orgId}`);
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
  "https://app.engage-smart.com/oauth/callback"
    );
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    console.log(`✅ Received tokens for ${service.toUpperCase()}`);
    
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;
    
    console.log(`👤 User email: ${userEmail}`);
    
    // Route to appropriate service handler
    switch (service.toLowerCase()) {
      case 'gmail':
        await handleGmailCallback(orgId, adminId, userEmail, tokens);
        break;
        
      case 'youtube':
        await handleYouTubeCallback(orgId, adminId, userEmail, tokens);
        break;
        
      case 'ads':
        await handleGoogleAdsCallback(orgId, adminId, userEmail, tokens);
        break;
        
      default:
        throw new Error(`Unsupported service: ${service}`);
    }
    
    res.json({
      success: true,
      service: service,
      email: userEmail,
      message: `${service.toUpperCase()} connected successfully!`
    });
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📧 Handle Gmail OAuth callback
 */
async function handleGmailCallback(orgId, adminId, userEmail, tokens) {
  console.log(`📧 Storing Gmail tokens for ${userEmail}`);
  
  const containerId = process.env.DEFAULT_CONTAINER_ID || 'default';
  
  // Store in universal GoogleOAuthConnection
  await prisma.googleOAuthConnection.upsert({
    where: {
      orgId_containerId_service: {
        orgId: orgId,
        containerId: containerId,
        service: 'gmail'
      }
    },
    update: {
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: 'active',
      updatedAt: new Date()
    },
    create: {
      id: createId(),
      orgId: orgId,
      containerId: containerId,
      service: 'gmail',
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: 'active'
    }
  });
  
  console.log(`✅ Gmail tokens stored in GoogleOAuthConnection`);
}

/**
 * 📺 Handle YouTube OAuth callback
 */
async function handleYouTubeCallback(orgId, adminId, userEmail, tokens) {
  console.log(`📺 Storing YouTube tokens + channel data for ${userEmail}`);
  
  const containerId = process.env.DEFAULT_CONTAINER_ID || 'default';
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://app.engage-smart.com/oauth/callback"
  );
  oauth2Client.setCredentials(tokens);
  
  // Get channel info from YouTube API
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const channelResponse = await youtube.channels.list({
    part: 'snippet',
    mine: true
  });
  
  const channel = channelResponse.data.items[0];
  if (!channel) {
    throw new Error('No YouTube channel found for this account');
  }
  
  // Store EVERYTHING in universal GoogleOAuthConnection
  await prisma.googleOAuthConnection.upsert({
    where: {
      orgId_containerId_service: {
        orgId: orgId,
        containerId: containerId,
        service: 'youtube'
      }
    },
    update: {
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      channelId: channel.id,
      channelName: channel.snippet.title,
      status: 'active',
      updatedAt: new Date()
    },
    create: {
      id: createId(),
      orgId: orgId,
      containerId: containerId,
      service: 'youtube',
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      channelId: channel.id,
      channelName: channel.snippet.title,
      status: 'active'
    }
  });
  
  console.log(`✅ YouTube tokens + channel data stored in GoogleOAuthConnection`);
}

/**
 * 📊 Handle Google Ads OAuth callback
 */
async function handleGoogleAdsCallback(orgId, adminId, userEmail, tokens) {
  console.log(`📊 Storing Google Ads tokens for ${userEmail}`);
  
  const containerId = process.env.DEFAULT_CONTAINER_ID || 'default';
  
  // Store in universal GoogleOAuthConnection
  await prisma.googleOAuthConnection.upsert({
    where: {
      orgId_containerId_service: {
        orgId: orgId,
        containerId: containerId,
        service: 'ads'
      }
    },
    update: {
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: 'active',
      updatedAt: new Date()
    },
    create: {
      id: createId(),
      orgId: orgId,
      containerId: containerId,
      service: 'ads',
      email: userEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: 'active'
    }
  });
  
  console.log(`✅ Google Ads tokens stored in GoogleOAuthConnection`);
}

/**
 * 🔍 Check connection status for any service
 * GET /api/google-oauth/status?service=gmail&orgId=xxx&adminId=xxx
 */
router.get('/status', async (req, res) => {
  try {
    const { service, orgId, adminId } = req.query;
    
    if (!service || !orgId || !adminId) {
      return res.status(400).json({ 
        error: 'service, orgId, and adminId are required' 
      });
    }
    
    const containerId = process.env.DEFAULT_CONTAINER_ID || 'default';
    
    // Check universal GoogleOAuthConnection table
    const connection = await prisma.googleOAuthConnection.findFirst({
      where: { 
        orgId: orgId,
        containerId: containerId,
        service: service.toLowerCase(),
        status: 'active'
      }
    });
    
    if (connection) {
      res.json({
        connected: true,
        service: service,
        email: connection.email,
        status: connection.status,
        connectedAt: connection.createdAt,
        // Service-specific data
        channelId: connection.channelId,
        channelName: connection.channelName,
        customerId: connection.customerId,
        accountName: connection.accountName
      });
    } else {
      res.json({
        connected: false,
        service: service,
        message: `${service.toUpperCase()} not connected`
      });
    }
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
