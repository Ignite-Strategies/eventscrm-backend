import express from 'express';
import prisma from '../config/prisma.js';

const router = express.Router();

// POST /api/engage/hydrate - Hydrate all engagement tool connections
router.post('/hydrate', async (req, res) => {
  try {
    const { orgId, containerId } = req.body;

    console.log('🔄 Hydrating engage connections for:', { orgId, containerId });

    if (!orgId && !containerId) {
      return res.status(400).json({
        success: false,
        error: 'orgId or containerId required'
      });
    }

    const connections = {
      youtube: null,
      instagram: null,
      facebook: null
    };

    // Check for YouTube connection
    try {
      const youtubeChannel = await prisma.youTubeChannel.findFirst({
        where: {
          OR: [
            { orgId: orgId || undefined },
            { containerId: containerId || undefined }
          ]
        },
        select: {
          channelId: true,
          title: true,
          thumbnail: true,
          subscriberCount: true
        }
      });

      if (youtubeChannel) {
        connections.youtube = youtubeChannel;
        console.log('✅ YouTube connected:', youtubeChannel.channelId);
      }
    } catch (error) {
      console.error('YouTube check error:', error);
    }

    // Check for Instagram connection
    // TODO: Implement when Instagram model exists
    // try {
    //   const instagramAccount = await prisma.instagramAccount.findFirst({
    //     where: {
    //       OR: [
    //         { orgId: orgId || undefined },
    //         { containerId: containerId || undefined }
    //       ]
    //     }
    //   });
    //   if (instagramAccount) {
    //     connections.instagram = instagramAccount;
    //   }
    // } catch (error) {
    //   console.error('Instagram check error:', error);
    // }

    // Check for Facebook connection
    // TODO: Implement when Facebook model exists

    console.log('✅ Engage hydration complete:', {
      youtube: !!connections.youtube,
      instagram: !!connections.instagram,
      facebook: !!connections.facebook
    });

    return res.status(200).json({
      success: true,
      connections
    });

  } catch (error) {
    console.error('❌ Engage hydration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

