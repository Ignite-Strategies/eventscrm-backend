import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { createId } from '@paralleldrive/cuid2';

const router = express.Router();
const prisma = new PrismaClient();

// 🔐 YOUTUBE OAUTH ROUTES

// Redirect to Google OAuth
router.get('/auth/youtube', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || "https://ignitestrategiescrm-frontend.vercel.app/youtubeoauth"
  );

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.redirect(authUrl);
});

// Handle OAuth callback
router.post('/oauth', async (req, res) => {
  try {
    const { code, containerId } = req.body;
    
    console.log('🔐 YouTube OAuth callback received:', { 
      code: code ? code.substring(0, 20) + '...' : 'missing',
      containerId: containerId || 'default'
    });
    
    if (!code) {
      throw new Error('No authorization code provided');
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || "https://ignitestrategiescrm-frontend.vercel.app/youtubeoauth"
    );

    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('🔧 OAuth2Client config:', {
      clientId: process.env.YOUTUBE_CLIENT_ID ? 'set' : 'missing',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET ? 'set' : 'missing',
      redirectUri: process.env.YOUTUBE_REDIRECT_URI
    });
    
    // Test Prisma client
    console.log('🔧 Prisma client test:', {
      hasYouTubeChannel: !!prisma.youtubeChannel,
      prismaKeys: Object.keys(prisma).filter(key => key.includes('youtube') || key.includes('YouTube'))
    });
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Tokens received successfully');
    oauth2Client.setCredentials(tokens);

    // Get channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true
    });

    const channel = channelResponse.data.items[0];
    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    // Store or update channel in database using raw SQL (Prisma client issues)
    const finalContainerId = containerId || 'default';
    
    // First try to find existing channel
    console.log('🔍 Checking for existing channel:', channel.id);
    let youtubeChannel = await prisma.$queryRaw`
      SELECT id, "channelId", "title", "thumbnail" 
      FROM "YouTubeChannel" 
      WHERE "channelId" = ${channel.id}
    `;
    
    console.log('🔍 Existing channel found:', youtubeChannel.length > 0);
    
    if (youtubeChannel.length > 0) {
      // Update existing channel
      await prisma.$queryRaw`
        UPDATE "YouTubeChannel" SET
          "title" = ${channel.snippet.title},
          "description" = ${channel.snippet.description},
          "thumbnail" = ${channel.snippet.thumbnails?.default?.url},
          "subscriberCount" = ${parseInt(channel.statistics.subscriberCount || '0')},
          "viewCount" = ${parseInt(channel.statistics.viewCount || '0')},
          "videoCount" = ${parseInt(channel.statistics.videoCount || '0')},
          "accessToken" = ${tokens.access_token},
          "refreshToken" = ${tokens.refresh_token},
          "expiresAt" = ${new Date(tokens.expiry_date)},
          "updatedAt" = NOW()
        WHERE "channelId" = ${channel.id}
      `;
      youtubeChannel = youtubeChannel[0];
    } else {
      // Insert new channel
      const insertResult = await prisma.$queryRaw`
        INSERT INTO "YouTubeChannel" (
          "id", "channelId", "title", "description", "thumbnail", 
          "subscriberCount", "viewCount", "videoCount", 
          "accessToken", "refreshToken", "expiresAt", "containerId"
        ) VALUES (
          ${createId()}, ${channel.id}, ${channel.snippet.title}, ${channel.snippet.description}, 
          ${channel.snippet.thumbnails?.default?.url}, 
          ${parseInt(channel.statistics.subscriberCount || '0')}, 
          ${parseInt(channel.statistics.viewCount || '0')}, 
          ${parseInt(channel.statistics.videoCount || '0')}, 
          ${tokens.access_token}, ${tokens.refresh_token}, 
          ${new Date(tokens.expiry_date)}, ${finalContainerId}
        ) RETURNING id, "channelId", "title", "thumbnail"
      `;
      youtubeChannel = insertResult[0];
    }

    res.json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      },
      channel: {
        id: youtubeChannel.id,
        channelId: youtubeChannel.channelId,
        title: youtubeChannel.title,
        thumbnail: youtubeChannel.thumbnail
      }
    });

  } catch (error) {
    console.error('YouTube OAuth error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
