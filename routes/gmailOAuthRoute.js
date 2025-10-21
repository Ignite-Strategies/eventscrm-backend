import express from 'express';
import { google } from 'googleapis';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Google OAuth2 Client Configuration for Gmail
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_GMAIL || "https://eventscrm-backend.onrender.com/api/gmail/oauth/callback"
  );
};

// POST /api/gmail/oauth/connect - Start Gmail OAuth flow
router.post("/connect", async (req, res) => {
  try {
    const { orgId, adminId } = req.body;

    if (!orgId || !adminId) {
      return res.status(400).json({ error: "orgId and adminId are required" });
    }

    const oauth2Client = getOAuth2Client();

    // Generate OAuth URL with Gmail sending scope
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // ← This gets us the refresh token!
      prompt: 'consent', // Force consent to get refresh token every time
      scope: [
        "https://www.googleapis.com/auth/gmail.send", // Send emails
        "https://www.googleapis.com/auth/userinfo.email" // Get user email
      ],
      state: JSON.stringify({ orgId, adminId }) // Pass both through state
    });

    console.log(`🔗 Generated Gmail OAuth URL for org: ${orgId}, admin: ${adminId}`);
    res.json({ authUrl });
  } catch (error) {
    console.error("❌ Error generating Gmail OAuth URL:", error);
    res.status(500).json({ error: "Failed to generate OAuth URL" });
  }
});

// GET /api/gmail/oauth/callback - Handle OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send("Missing authorization code or state");
    }

    const { orgId, adminId } = JSON.parse(state);

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('🎫 Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    // Get user info to store connected email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store the Gmail connection in the database
    const gmailConnection = await prisma.gmailConnection.create({
      data: {
        orgId,
        adminId,
        email: userInfo.data.email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        status: "active"
      }
    });

    console.log(`✅ Gmail connected: ${gmailConnection.id} for ${userInfo.data.email}`);

    // Redirect to success page in frontend
    res.redirect(`https://your-frontend-url.com/settings?gmailConnected=true`);
  } catch (error) {
    console.error("❌ Error in Gmail OAuth callback:", error);
    res.status(500).send("Gmail OAuth callback failed");
  }
});

// GET /api/gmail/oauth/status - Check if Gmail is connected for org
router.get("/status", async (req, res) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const connection = await prisma.gmailConnection.findFirst({
      where: { 
        orgId,
        status: "active"
      },
      select: {
        id: true,
        email: true,
        tokenExpiry: true,
        createdAt: true
      }
    });

    res.json({ 
      connected: !!connection,
      connection: connection || null
    });
  } catch (error) {
    console.error("❌ Error checking Gmail status:", error);
    res.status(500).json({ error: "Failed to check Gmail status" });
  }
});

// POST /api/gmail/oauth/refresh-token - Refresh Gmail access token
router.post("/refresh-token", async (req, res) => {
  try {
    const { orgId } = req.body;

    const connection = await prisma.gmailConnection.findFirst({
      where: { 
        orgId,
        status: "active"
      }
    });

    if (!connection || !connection.refreshToken) {
      return res.status(404).json({ error: "Gmail connection not found or no refresh token" });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken
    });

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update database with new access token
    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    });

    console.log(`✅ Gmail token refreshed for connection: ${connection.id}`);
    res.json({ 
      success: true, 
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date
    });
  } catch (error) {
    console.error("❌ Error refreshing Gmail token:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// Helper function to get valid Gmail access token (auto-refresh if needed)
export async function getValidGmailToken(orgId) {
  const connection = await prisma.gmailConnection.findFirst({
    where: { 
      orgId,
      status: "active"
    }
  });

  if (!connection) {
    throw new Error('No Gmail connection found for this org');
  }

  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date();
  const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  if (connection.tokenExpiry && connection.tokenExpiry < expiryBuffer) {
    console.log('🔄 Token expired or expiring soon, refreshing...');
    
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update database
    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    });

    console.log('✅ Token auto-refreshed');
    return credentials.access_token;
  }

  return connection.accessToken;
}

// DELETE /api/gmail/oauth/disconnect - Disconnect Gmail
router.delete("/disconnect", async (req, res) => {
  try {
    const { orgId } = req.query;

    const connection = await prisma.gmailConnection.findFirst({
      where: { orgId, status: "active" }
    });

    if (!connection) {
      return res.status(404).json({ error: "Gmail connection not found" });
    }

    // Mark as disconnected
    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: { status: "disconnected" }
    });

    console.log(`✅ Gmail disconnected for org: ${orgId}`);
    res.json({ message: "Gmail disconnected successfully" });
  } catch (error) {
    console.error("❌ Error disconnecting Gmail:", error);
    res.status(500).json({ error: "Failed to disconnect Gmail" });
  }
});

export default router;

