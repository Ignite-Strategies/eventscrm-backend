import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🎬 YOUTUBE ACCOUNTS ROUTES

// Get YouTube account by user
router.get('/accounts', async (req, res) => {
  try {
    const { userId, channelId } = req.query;
    
    let query = 'SELECT * FROM youtube_accounts WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = $1';
      params.push(userId);
    }
    
    if (channelId) {
      query += ' AND channel_id = $2';
      params.push(channelId);
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      accounts: result.rows
    });
    
  } catch (error) {
    console.error('Get YouTube accounts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create/Update YouTube account
router.post('/accounts', async (req, res) => {
  try {
    const {
      userId,
      googleUserId,
      channelId,
      channelTitle,
      channelDescription,
      channelThumbnail,
      subscriberCount,
      viewCount,
      videoCount,
      accessToken,
      refreshToken,
      tokenScope,
      tokenType,
      tokenExpiry
    } = req.body;
    
    // Upsert account
    const query = `
      INSERT INTO youtube_accounts (
        user_id, google_user_id, channel_id, channel_title, channel_description,
        channel_thumbnail, subscriber_count, view_count, video_count,
        access_token, refresh_token, token_scope, token_type, token_expiry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (channel_id) 
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        google_user_id = EXCLUDED.google_user_id,
        channel_title = EXCLUDED.channel_title,
        channel_description = EXCLUDED.channel_description,
        channel_thumbnail = EXCLUDED.channel_thumbnail,
        subscriber_count = EXCLUDED.subscriber_count,
        view_count = EXCLUDED.view_count,
        video_count = EXCLUDED.video_count,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_scope = EXCLUDED.token_scope,
        token_type = EXCLUDED.token_type,
        token_expiry = EXCLUDED.token_expiry,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, googleUserId, channelId, channelTitle, channelDescription,
      channelThumbnail, subscriberCount, viewCount, videoCount,
      accessToken, refreshToken, tokenScope, tokenType, tokenExpiry
    ]);
    
    res.json({
      success: true,
      account: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create YouTube account error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete YouTube account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM youtube_accounts WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'YouTube account not found'
      });
    }
    
    res.json({
      success: true,
      message: 'YouTube account deleted'
    });
    
  } catch (error) {
    console.error('Delete YouTube account error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
