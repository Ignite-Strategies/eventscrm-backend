import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const router = express.Router();
const prisma = new PrismaClient();

// 📋 YOUTUBE PLAYLISTS ROUTES

// Get playlists
router.get('/playlists', async (req, res) => {
  try {
    const containerId = req.query.containerId;
    
    const channel = await prisma.youtubeChannel.findFirst({
      where: { containerId }
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'No YouTube channel connected'
      });
    }

    // Refresh tokens if needed
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
      expiry_date: channel.expiresAt.getTime()
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Get playlists from YouTube API
    const playlistsResponse = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      channelId: channel.channelId,
      maxResults: 50
    });

    const playlists = playlistsResponse.data.items.map(playlist => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      thumbnail: playlist.snippet.thumbnails?.default?.url,
      itemCount: playlist.contentDetails.itemCount
    }));

    res.json({
      success: true,
      playlists
    });

  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
