import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// 🎬 YOUTUBE UPLOAD ROUTES

// Upload video
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    const { title, description, tags, playlistId, privacy } = req.body;
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
      process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      "https://app.engage-smart.com/oauth/callback" // Hardcoded (not secret)
    );

    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
      expiry_date: channel.expiresAt.getTime()
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Upload video
    const uploadResponse = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          categoryId: '22' // People & Blogs
        },
        status: {
          privacyStatus: privacy || 'public',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(req.file.path)
      }
    });

    const videoId = uploadResponse.data.id;

    // Add to playlist if specified
    if (playlistId) {
      await youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });
    }

    // Store video in database
    const youtubeVideo = await prisma.youtubeVideo.create({
      data: {
        videoId: videoId,
        title: title,
        description: description,
        privacyStatus: privacy || 'public',
        channelId: channel.id,
        playlistId: playlistId || null,
        uploadedAt: new Date()
      }
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      video: {
        id: youtubeVideo.id,
        videoId: youtubeVideo.videoId,
        title: youtubeVideo.title,
        url: `https://www.youtube.com/watch?v=${videoId}`
      }
    });

  } catch (error) {
    console.error('Video upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
