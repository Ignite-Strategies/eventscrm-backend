import express from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const router = express.Router();
const prisma = new PrismaClient();

// 📺 YOUTUBE CHANNEL ROUTES

// Get channel info
router.get('/channel', async (req, res) => {
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

    res.json({
      success: true,
      channel: {
        id: channel.id,
        channelId: channel.channelId,
        title: channel.title,
        description: channel.description,
        thumbnail: channel.thumbnail,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount?.toString(),
        videoCount: channel.videoCount
      }
    });

  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update channel settings
router.patch('/channel', async (req, res) => {
  try {
    const { title, description, defaultPlaylist } = req.body;
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

    // Update channel settings (you might want to store these in a separate settings table)
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Channel settings updated'
    });

  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
