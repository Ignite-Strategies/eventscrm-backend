/**
 * 🎟️ Eventbrite OAuth Handler
 * Handles OAuth flow for Eventbrite API integration
 * Pattern: Similar to unifiedGoogleOAuthRoute.js
 */

import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { createId } from '@paralleldrive/cuid2';
import axios from 'axios';

const router = express.Router();
const prisma = getPrismaClient();

// Eventbrite OAuth configuration
const EVENTBRITE_OAUTH_URL = 'https://www.eventbrite.com/oauth/authorize';
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

/**
 * 🔐 Initiate OAuth for Eventbrite
 * GET /api/eventbrite-oauth/auth?orgId=xxx&adminId=xxx&containerId=xxx
 */
router.get('/auth', (req, res) => {
  const { orgId, adminId, containerId } = req.query;
  
  // Validate required parameters
  if (!orgId || !adminId || !containerId) {
    return res.status(400).json({ 
      error: 'orgId, adminId, and containerId are required'
    });
  }
  
  console.log(`🚀 Initiating Eventbrite OAuth for org: ${orgId}, admin: ${adminId}, container: ${containerId}`);
  
  // Create state parameter with context info
  const state = Buffer.from(JSON.stringify({ 
    orgId, 
    adminId,
    containerId 
  })).toString('base64');
  
  // Eventbrite OAuth URL parameters
  const params = new URLSearchParams({
    client_id: process.env.EVENTBRITE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.EVENTBRITE_REDIRECT_URI || 'https://app.engage-smart.com/oauth/eventbrite-callback',
    state: state
  });
  
  const authUrl = `${EVENTBRITE_OAUTH_URL}?${params.toString()}`;

  console.log(`🔗 Generated Eventbrite OAuth URL`);
  res.json({ 
    authUrl,
    service: 'eventbrite'
  });
});

/**
 * 🔄 Eventbrite OAuth Callback Handler
 * POST /api/eventbrite-oauth/callback
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }
    
    // Decode state to get context info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
    
    const { orgId, adminId, containerId } = stateData;
    
    if (!orgId || !adminId || !containerId) {
      throw new Error('Missing orgId, adminId, or containerId in state');
    }
    
    console.log(`🔄 Processing Eventbrite OAuth callback for org: ${orgId}`);
    
    // Exchange code for access token
    const tokenResponse = await axios.post(EVENTBRITE_TOKEN_URL, {
      code: code,
      client_secret: process.env.EVENTBRITE_CLIENT_SECRET,
      client_id: process.env.EVENTBRITE_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: process.env.EVENTBRITE_REDIRECT_URI || 'https://app.engage-smart.com/oauth/eventbrite-callback'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const { access_token, refresh_token } = tokenResponse.data;
    
    console.log(`✅ Received Eventbrite tokens`);
    
    // Get user info from Eventbrite API
    const userResponse = await axios.get(`${EVENTBRITE_API_BASE}/users/me/`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const userData = userResponse.data;
    const userEmail = userData.emails?.[0]?.email || 'unknown@eventbrite.com';
    const eventbriteUserId = userData.id;
    
    console.log(`👤 Eventbrite user: ${userEmail} (ID: ${eventbriteUserId})`);
    
    // Get user's organizations (if any)
    let organizationId = null;
    let organizationName = null;
    
    try {
      const orgsResponse = await axios.get(`${EVENTBRITE_API_BASE}/users/me/organizations/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      if (orgsResponse.data.organizations && orgsResponse.data.organizations.length > 0) {
        organizationId = orgsResponse.data.organizations[0].id;
        organizationName = orgsResponse.data.organizations[0].name;
        console.log(`🏢 Eventbrite organization: ${organizationName} (ID: ${organizationId})`);
      }
    } catch (orgError) {
      console.log('ℹ️ No Eventbrite organization found (this is OK - user may not have one)');
    }
    
    // Store connection in database
    const connectionId = await handleEventbriteCallback(
      orgId, 
      adminId, 
      containerId, 
      userEmail, 
      eventbriteUserId,
      access_token,
      refresh_token,
      organizationId,
      organizationName
    );
    
    res.json({
      success: true,
      service: 'eventbrite',
      email: userEmail,
      eventbriteUserId: eventbriteUserId,
      connectionId: connectionId,
      message: 'Eventbrite connected successfully!'
    });
    
  } catch (error) {
    console.error('❌ Eventbrite OAuth callback error:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      error: error.response?.data?.error_description || error.message
    });
  }
});

/**
 * 🎟️ Handle Eventbrite OAuth callback - Store tokens
 */
async function handleEventbriteCallback(
  orgId, 
  adminId, 
  containerId, 
  userEmail, 
  eventbriteUserId,
  accessToken,
  refreshToken,
  organizationId,
  organizationName
) {
  console.log(`🎟️ Storing Eventbrite tokens for ${userEmail}`);
  console.log(`🎟️ Using containerId: ${containerId} for org: ${orgId}`);
  
  // Check if connection already exists for this org
  const existingConnection = await prisma.eventbriteOAuthConnection.findFirst({
    where: {
      orgId: orgId,
      containerId: containerId
    }
  });
  
  let connectionId;
  
  if (existingConnection) {
    // Update existing connection - only update tokens and user data, not relationships
    await prisma.eventbriteOAuthConnection.update({
      where: { id: existingConnection.id },
      data: {
        email: userEmail,
        eventbriteUserId: eventbriteUserId,
        accessToken: accessToken,
        refreshToken: refreshToken || existingConnection.refreshToken,
        organizationId: organizationId,
        organizationName: organizationName,
        status: 'active',
        updatedAt: new Date()
      }
    });
    connectionId = existingConnection.id;
    console.log(`✅ Eventbrite tokens updated for existing connection: ${connectionId}`);
  } else {
    // Create new connection with all relationship fields
    const newConnection = await prisma.eventbriteOAuthConnection.create({
      data: {
        id: createId(),
        orgId: orgId,
        containerId: containerId,
        adminId: adminId,
        email: userEmail,
        eventbriteUserId: eventbriteUserId,
        accessToken: accessToken,
        refreshToken: refreshToken,
        organizationId: organizationId,
        organizationName: organizationName,
        status: 'active'
      }
    });
    connectionId = newConnection.id;
    console.log(`✅ Eventbrite connection created: ${connectionId}`);
  }
  
  return connectionId;
}

/**
 * 🔍 Check Eventbrite connection status
 * GET /api/eventbrite-oauth/status?orgId=xxx&containerId=xxx
 */
router.get('/status', async (req, res) => {
  try {
    const { orgId, containerId } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({ 
        error: 'orgId and containerId are required' 
      });
    }
    
    console.log(`🔍 Checking Eventbrite status for org: ${orgId}, container: ${containerId}`);
    
    const connection = await prisma.eventbriteOAuthConnection.findFirst({
      where: { 
        orgId: orgId,
        containerId: containerId,
        status: 'active'
      }
    });
    
    console.log(`🔍 Found connection:`, connection ? {
      id: connection.id,
      email: connection.email,
      status: connection.status,
      orgId: connection.orgId,
      adminId: connection.adminId,
      containerId: connection.containerId,
      eventbriteUserId: connection.eventbriteUserId
    } : 'No connection found');
    
    if (connection) {
      res.json({
        connected: true,
        service: 'eventbrite',
        email: connection.email,
        eventbriteUserId: connection.eventbriteUserId,
        organizationId: connection.organizationId,
        organizationName: connection.organizationName,
        status: connection.status,
        connectedAt: connection.createdAt
      });
    } else {
      res.json({
        connected: false,
        service: 'eventbrite',
        message: 'Eventbrite not connected'
      });
    }
    
  } catch (error) {
    console.error('❌ Eventbrite status check error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * 🔌 Disconnect Eventbrite
 * DELETE /api/eventbrite-oauth/disconnect?orgId=xxx&containerId=xxx
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const { orgId, containerId } = req.query;
    
    if (!orgId || !containerId) {
      return res.status(400).json({ 
        error: 'orgId and containerId are required' 
      });
    }
    
    console.log(`🔌 Disconnecting Eventbrite for org: ${orgId}, container: ${containerId}`);
    
    const connection = await prisma.eventbriteOAuthConnection.findFirst({
      where: { 
        orgId: orgId,
        containerId: containerId
      }
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'No Eventbrite connection found'
      });
    }
    
    // Update status to revoked instead of deleting (keeps history)
    await prisma.eventbriteOAuthConnection.update({
      where: { id: connection.id },
      data: {
        status: 'revoked',
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Eventbrite connection revoked: ${connection.id}`);
    
    res.json({
      success: true,
      message: 'Eventbrite disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ Eventbrite disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

