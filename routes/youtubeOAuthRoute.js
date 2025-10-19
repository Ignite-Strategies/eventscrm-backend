import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const router = express.Router();
const prisma = new PrismaClient();

// 🔐 YOUTUBE OAUTH ROUTES

// Redirect to Google OAuth
router.get('/auth/youtube', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
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
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
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

    // Store or update channel in database using raw SQL
    const containerId = req.body.containerId || 'default';
    
    const upsertQuery = `
      INSERT INTO youtube_accounts (
        container_id, org_id, google_user_id, channel_id, channel_title, 
        channel_description, channel_thumbnail_url, subscriber_count, 
        view_count, video_count, access_token, refresh_token, 
        token_scope, token_type, token_expiry, connected_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      ON CONFLICT (channel_id) 
      DO UPDATE SET
        channel_title = EXCLUDED.channel_title,
        channel_description = EXCLUDED.channel_description,
        channel_thumbnail_url = EXCLUDED.channel_thumbnail_url,
        subscriber_count = EXCLUDED.subscriber_count,
        view_count = EXCLUDED.view_count,
        video_count = EXCLUDED.video_count,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_scope = EXCLUDED.token_scope,
        token_type = EXCLUDED.token_type,
        token_expiry = EXCLUDED.token_expiry,
        updated_at = NOW()
      RETURNING id, channel_id, channel_title, channel_thumbnail_url
    `;
    
    const result = await prisma.$queryRawUnsafe(upsertQuery, [
      containerId,
      null, // org_id - will be set later
      channel.snippet.title, // google_user_id placeholder
      channel.id,
      channel.snippet.title,
      channel.snippet.description,
      channel.snippet.thumbnails?.default?.url,
      parseInt(channel.statistics.subscriberCount || '0'),
      parseInt(channel.statistics.viewCount || '0'),
      parseInt(channel.statistics.videoCount || '0'),
      tokens.access_token,
      tokens.refresh_token,
      tokens.scope,
      tokens.token_type,
      new Date(tokens.expiry_date)
    ]);
    
    const youtubeChannel = result[0];

    res.json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      },
      channel: {
        id: youtubeChannel.id,
        channelId: youtubeChannel.channel_id,
        title: youtubeChannel.channel_title,
        thumbnail: youtubeChannel.channel_thumbnail_url
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
