/**
 * 🧭 Unified Google OAuth Handler (EngageSmart)
 * Single callback endpoint for ALL Google services (Gmail, YouTube, Ads)
 */

import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { google } from 'googleapis';
import { createId } from '@paralleldrive/cuid2';
import { getScopesForService } from '../config/oauthScopes.js';
import { MASTER_KEYS_CONFIG } from '../config/masterKeysConfig.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * 🔐 Initiate OAuth for any Google service
 * GET /api/google-oauth/auth?service=gmail&orgId=xxx&adminId=xxx
 */
router.get('/auth', (req, res) => {
  const { service, orgId, adminId, containerId } = req.query;
  
  // Validate required parameters
  if (!service || !orgId || !adminId || !containerId) {
    return res.status(400).json({ 
      error: 'service, orgId, adminId, and containerId are required',
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
    adminId,
    containerId 
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
    
    const { service, orgId, adminId, containerId } = stateData;
    
    if (!service || !orgId || !adminId || !containerId) {
      throw new Error('Missing service, orgId, adminId, or containerId in state');
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
    
    // Route to appropriate service handler and get connection ID
    let connectionId;
    switch (service.toLowerCase()) {
      case 'gmail':
        connectionId = await handleGmailCallback(orgId, adminId, containerId, userEmail, tokens);
        break;
        
      case 'youtube':
        connectionId = await handleYouTubeCallback(orgId, adminId, containerId, userEmail, tokens);
        break;
        
      case 'ads':
        connectionId = await handleGoogleAdsCallback(orgId, adminId, containerId, userEmail, tokens);
        break;
        
      default:
        throw new Error(`Unsupported service: ${service}`);
    }
    
    res.json({
      success: true,
      service: service,
      email: userEmail,
      connectionId: connectionId,
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
async function handleGmailCallback(orgId, adminId, containerId, userEmail, tokens) {
  console.log(`📧 Storing Gmail tokens for ${userEmail}`);
  
  console.log(`📧 Using containerId: ${containerId} for org: ${orgId}`);
  
  // Check if connection already exists for this org/service
  const existingConnection = await prisma.googleOAuthConnection.findFirst({
    where: {
      orgId: orgId,
      service: 'gmail'
    }
  });
  
  let connectionId;
  
  if (existingConnection) {
    // Update existing connection - only update tokens, not relationships
    await prisma.googleOAuthConnection.update({
      where: { id: existingConnection.id },
      data: {
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: 'active',
        updatedAt: new Date()
      }
    });
    connectionId = existingConnection.id;
    console.log(`✅ Gmail tokens updated for existing connection: ${connectionId}`);
  } else {
    // Create new connection with all relationship fields
    const newConnection = await prisma.googleOAuthConnection.create({
      data: {
        id: createId(),
        orgId: orgId,
        containerId: containerId,
        adminId: adminId,
        service: 'gmail',
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: 'active'
      }
    });
    connectionId = newConnection.id;
    console.log(`✅ Gmail connection created: ${connectionId}`);
  }
  
  return connectionId;
}

/**
 * 📺 Handle YouTube OAuth callback
 */
async function handleYouTubeCallback(orgId, adminId, containerId, userEmail, tokens) {
  console.log(`📺 Storing YouTube tokens + channel data for ${userEmail}`);
  
  console.log(`📺 Using containerId: ${containerId} for org: ${orgId}`);
  
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
  
  // Check if connection already exists for this org/service
  const existingConnection = await prisma.googleOAuthConnection.findFirst({
    where: {
      orgId: orgId,
      service: 'youtube'
    }
  });
  
  let connectionId;
  
  if (existingConnection) {
    // Update existing connection - only update tokens and channel data, not relationships
    await prisma.googleOAuthConnection.update({
      where: { id: existingConnection.id },
      data: {
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        channelId: channel.id,
        channelName: channel.snippet.title,
        status: 'active',
        updatedAt: new Date()
      }
    });
    connectionId = existingConnection.id;
    console.log(`✅ YouTube tokens updated for existing connection: ${connectionId}`);
  } else {
    // Create new connection with all relationship fields
    const newConnection = await prisma.googleOAuthConnection.create({
      data: {
        id: createId(),
        orgId: orgId,
        containerId: containerId,
        adminId: adminId,
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
    connectionId = newConnection.id;
    console.log(`✅ YouTube connection created: ${connectionId}`);
  }
  
  return connectionId;
}

/**
 * 📊 Handle Google Ads OAuth callback
 */
async function handleGoogleAdsCallback(orgId, adminId, containerId, userEmail, tokens) {
  console.log(`📊 Storing Google Ads tokens for ${userEmail}`);
  
  console.log(`📊 Using containerId: ${containerId} for org: ${orgId}`);
  
  // Check if connection already exists for this org/service
  const existingConnection = await prisma.googleOAuthConnection.findFirst({
    where: {
      orgId: orgId,
      service: 'ads'
    }
  });
  
  let connectionId;
  
  if (existingConnection) {
    // Update existing connection - only update tokens, not relationships
    await prisma.googleOAuthConnection.update({
      where: { id: existingConnection.id },
      data: {
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: 'active',
        updatedAt: new Date()
      }
    });
    connectionId = existingConnection.id;
    console.log(`✅ Google Ads tokens updated for existing connection: ${connectionId}`);
  } else {
    // Create new connection with all relationship fields
    const newConnection = await prisma.googleOAuthConnection.create({
      data: {
        id: createId(),
        orgId: orgId,
        containerId: containerId,
        adminId: adminId,
        service: 'ads',
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: 'active'
      }
    });
    connectionId = newConnection.id;
    console.log(`✅ Google Ads connection created: ${connectionId}`);
  }
  
  return connectionId;
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
    
    console.log(`🔍 Checking ${service} status for org: ${orgId}, admin: ${adminId}`);
    
    // Check with provided values first
    let connection = await prisma.googleOAuthConnection.findFirst({
      where: { 
        orgId: orgId,
        service: service.toLowerCase(),
        status: 'active'
      }
    });
    
    // If no connection found with provided values, try with config values for debugging
    if (!connection && service.toLowerCase() === 'gmail') {
      console.log('🔍 No connection found with provided values, trying config values...');
      connection = await prisma.googleOAuthConnection.findFirst({
        where: { 
          orgId: MASTER_KEYS_CONFIG.ORG_ID,
          service: service.toLowerCase(),
          status: 'active'
        }
      });
    }
    
    console.log(`🔍 Found connection:`, connection ? {
      id: connection.id,
      email: connection.email,
      service: connection.service,
      status: connection.status,
      orgId: connection.orgId,
      adminId: connection.adminId,
      containerId: connection.containerId
    } : 'No connection found');
    
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
