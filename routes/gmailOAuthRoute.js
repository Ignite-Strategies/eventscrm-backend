import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { google } from 'googleapis';
import { createId } from '@paralleldrive/cuid2';

const router = express.Router();
const prisma = getPrismaClient();

// 🔐 GMAIL OAUTH ROUTES (Direct Google OAuth - NOT Firebase!)

/**
 * GET /gmail-oauth/auth
 * Redirect user to Google OAuth with Gmail scope
 * Requires: orgId and adminId as query params
 */
router.get('/auth', (req, res) => {
  const { orgId, adminId } = req.query;
  
  console.log('🔐 Gmail OAuth: Initiating flow', { orgId, adminId });
  
  if (!orgId || !adminId) {
    return res.status(400).json({ error: 'orgId and adminId are required' });
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || "https://ignitestrategiescrm-frontend.vercel.app/gmailoauth"
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email'  // To get user's email address
  ];

  // Generate OAuth URL with state parameter to preserve orgId/adminId
  const state = Buffer.from(JSON.stringify({ orgId, adminId })).toString('base64');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // ← CRITICAL! Gets refresh token
    scope: scopes,
    prompt: 'consent',       // Force consent screen to ensure refresh token
    state: state             // Pass orgId/adminId through OAuth flow
  });

  console.log('🔐 Redirecting to Google OAuth...');
  res.redirect(authUrl);
});

/**
 * POST /gmail-oauth/callback
 * Exchange authorization code for tokens and store in database
 * Called by frontend after Google redirects back
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    console.log('🔐 Gmail OAuth callback received:', { 
      code: code ? code.substring(0, 20) + '...' : 'missing',
      state: state ? 'present' : 'missing'
    });
    
    if (!code) {
      throw new Error('No authorization code provided');
    }
    
    // Decode state to get orgId/adminId
    let orgId, adminId;
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        orgId = decoded.orgId;
        adminId = decoded.adminId;
      } catch (e) {
        console.error('❌ Failed to decode state:', e);
      }
    }
    
    // Fallback to request body if state decode fails
    if (!orgId || !adminId) {
      orgId = req.body.orgId;
      adminId = req.body.adminId;
    }
    
    if (!orgId || !adminId) {
      throw new Error('orgId and adminId are required');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || "https://ignitestrategiescrm-frontend.vercel.app/gmailoauth"
    );

    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('🔧 OAuth2Client config:', {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'set' : 'missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'missing',
      redirectUri: process.env.GMAIL_REDIRECT_URI
    });
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date ? new Date(tokens.expiry_date) : 'unknown'
    });
    
    if (!tokens.refresh_token) {
      console.warn('⚠️ No refresh token received! User may have already authorized this app.');
    }
    
    oauth2Client.setCredentials(tokens);

    // Get user's email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    
    console.log('✅ Gmail account:', email);

    // Store or update Gmail connection in database
    console.log('💾 Storing Gmail connection for:', { orgId, adminId, email });
    
    // Check if connection already exists
    const existing = await prisma.gmailConnection.findFirst({
      where: {
        orgId,
        adminId
      }
    });
    
    if (existing) {
      // Update existing connection
      console.log('🔄 Updating existing Gmail connection:', existing.id);
      await prisma.gmailConnection.update({
        where: { id: existing.id },
        data: {
          email,
          refreshToken: tokens.refresh_token || existing.refreshToken, // Keep old if no new one
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          status: 'active',
          updatedAt: new Date()
        }
      });
    } else {
      // Create new connection
      console.log('✨ Creating new Gmail connection');
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. Please revoke app access and try again.');
      }
      
      await prisma.gmailConnection.create({
        data: {
          id: createId(),
          orgId,
          adminId,
          email,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          status: 'active'
        }
      });
    }

    console.log('✅ Gmail connection stored successfully!');

    res.json({
      success: true,
      email,
      message: 'Gmail connected successfully! You can now send emails.'
    });

  } catch (error) {
    console.error('❌ Gmail OAuth error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /gmail-oauth/status
 * Check if Gmail is connected for this org/admin
 */
router.get('/status', async (req, res) => {
  try {
    const { orgId, adminId } = req.query;
    
    if (!orgId || !adminId) {
      return res.status(400).json({ error: 'orgId and adminId are required' });
    }
    
    const connection = await prisma.gmailConnection.findFirst({
      where: {
        orgId,
        adminId,
        status: 'active'
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (connection) {
      res.json({
        connected: true,
        email: connection.email,
        connectedAt: connection.createdAt
      });
    } else {
      res.json({
        connected: false
      });
    }
    
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /gmail-oauth/disconnect
 * Disconnect Gmail for this org/admin
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const { orgId, adminId } = req.body;
    
    if (!orgId || !adminId) {
      return res.status(400).json({ error: 'orgId and adminId are required' });
    }
    
    await prisma.gmailConnection.updateMany({
      where: {
        orgId,
        adminId
      },
      data: {
        status: 'disconnected',
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Gmail disconnected successfully'
    });
    
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

