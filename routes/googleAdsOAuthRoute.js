import express from 'express';
import { google } from 'googleapis';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Google OAuth2 Client Configuration
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://eventscrm-backend.vercel.app/api/googleads/callback"
  );
};

// POST /api/googleads/connect - Start OAuth flow
router.post("/connect", async (req, res) => {
  try {
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const oauth2Client = getOAuth2Client();

    // Generate OAuth URL with proper scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/adwords" // Google Ads API scope
      ],
      state: orgId // Pass orgId through state parameter
    });

    console.log(`🔗 Generated OAuth URL for org: ${orgId}`);
    res.json({ authUrl });
  } catch (error) {
    console.error("❌ Error generating OAuth URL:", error);
    res.status(500).json({ error: "Failed to generate OAuth URL" });
  }
});

// GET /api/googleads/callback - Handle OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const orgId = state; // orgId passed through state parameter

    if (!code || !orgId) {
      return res.status(400).send("Missing authorization code or orgId");
    }

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info to store connected email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Create GoogleAdAccount record
    const googleAdAccount = await prisma.googleAdAccount.create({
      data: {
        orgId,
        displayName: `Google Ads Account - ${userInfo.data.email}`,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedEmail: userInfo.data.email,
        status: "active",
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
      }
    });

    // Log the connection
    await prisma.googleAdSyncLog.create({
      data: {
        googleAdAccountId: googleAdAccount.id,
        action: "oauth_connect",
        success: true,
        response: JSON.stringify({ email: userInfo.data.email })
      }
    });

    console.log(`✅ Google Ads account connected: ${googleAdAccount.id} for org: ${orgId}`);

    // Redirect to success page in frontend
    res.redirect(`https://your-frontend-url.com/engage?googleAdsConnected=true`);
  } catch (error) {
    console.error("❌ Error in OAuth callback:", error);
    res.status(500).send("OAuth callback failed");
  }
});

// GET /api/googleads/accounts - Get all connected accounts for org
router.get("/accounts", async (req, res) => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const accounts = await prisma.googleAdAccount.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            campaigns: true
          }
        }
      }
    });

    res.json(accounts);
  } catch (error) {
    console.error("❌ Error fetching Google Ads accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// POST /api/googleads/refresh-token - Refresh access token
router.post("/refresh-token", async (req, res) => {
  try {
    const { accountId } = req.body;

    const account = await prisma.googleAdAccount.findUnique({
      where: { id: accountId }
    });

    if (!account || !account.refreshToken) {
      return res.status(404).json({ error: "Account not found or no refresh token" });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: account.refreshToken
    });

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update database
    await prisma.googleAdAccount.update({
      where: { id: accountId },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    });

    // Log the refresh
    await prisma.googleAdSyncLog.create({
      data: {
        googleAdAccountId: accountId,
        action: "refresh_token",
        success: true
      }
    });

    console.log(`✅ Token refreshed for account: ${accountId}`);
    res.json({ success: true, accessToken: credentials.access_token });
  } catch (error) {
    console.error("❌ Error refreshing token:", error);
    
    // Log the failure
    if (req.body.accountId) {
      await prisma.googleAdSyncLog.create({
        data: {
          googleAdAccountId: req.body.accountId,
          action: "refresh_token",
          success: false,
          errorMessage: error.message
        }
      });
    }

    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// DELETE /api/googleads/accounts/:id - Disconnect account
router.delete("/accounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.query;

    // Verify ownership
    const account = await prisma.googleAdAccount.findFirst({
      where: { id, orgId }
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Soft delete - mark as revoked
    await prisma.googleAdAccount.update({
      where: { id },
      data: { status: "revoked" }
    });

    console.log(`✅ Google Ads account revoked: ${id}`);
    res.json({ message: "Account disconnected successfully" });
  } catch (error) {
    console.error("❌ Error disconnecting account:", error);
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

export default router;

