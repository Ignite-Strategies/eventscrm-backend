import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🎬 YOUTUBE VIDEOS ROUTES (with Engage categorization)

// Get videos by engage criteria
router.get('/videos', async (req, res) => {
  try {
    const { 
      accountId, 
      engageId, 
      engageType, 
      engageCategory,
      playlistId 
    } = req.query;
    
    let query = `
      SELECT v.*, a.channel_title, a.channel_thumbnail as account_thumbnail
      FROM youtube_videos v
      JOIN youtube_accounts a ON v.account_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (accountId) {
      paramCount++;
      query += ` AND v.account_id = $${paramCount}`;
      params.push(accountId);
    }
    
    if (engageId) {
      paramCount++;
      query += ` AND v.engage_id = $${paramCount}`;
      params.push(engageId);
    }
    
    if (engageType) {
      paramCount++;
      query += ` AND v.engage_type = $${paramCount}`;
      params.push(engageType);
    }
    
    if (engageCategory) {
      paramCount++;
      query += ` AND v.engage_category = $${paramCount}`;
      params.push(engageCategory);
    }
    
    if (playlistId) {
      paramCount++;
      query += ` AND v.playlist_id = $${paramCount}`;
      params.push(playlistId);
    }
    
    query += ' ORDER BY v.uploaded_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      videos: result.rows
    });
    
  } catch (error) {
    console.error('Get YouTube videos error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create video with engage categorization
router.post('/videos', async (req, res) => {
  try {
    const {
      accountId,
      playlistId,
      videoId,
      title,
      description,
      thumbnail,
      duration,
      viewCount,
      likeCount,
      commentCount,
      privacyStatus,
      engageId,
      engageType,
      engageCategory,
      uploadedAt
    } = req.body;
    
    const query = `
      INSERT INTO youtube_videos (
        account_id, playlist_id, video_id, title, description, thumbnail,
        duration, view_count, like_count, comment_count, privacy_status,
        engage_id, engage_type, engage_category, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (video_id) 
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        duration = EXCLUDED.duration,
        view_count = EXCLUDED.view_count,
        like_count = EXCLUDED.like_count,
        comment_count = EXCLUDED.comment_count,
        privacy_status = EXCLUDED.privacy_status,
        engage_id = EXCLUDED.engage_id,
        engage_type = EXCLUDED.engage_type,
        engage_category = EXCLUDED.engage_category,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      accountId, playlistId, videoId, title, description, thumbnail,
      duration, viewCount, likeCount, commentCount, privacyStatus,
      engageId, engageType, engageCategory, uploadedAt
    ]);
    
    res.json({
      success: true,
      video: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create YouTube video error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get videos by engage type (for dashboard)
router.get('/videos/by-engage-type', async (req, res) => {
  try {
    const { engageType } = req.query;
    
    const query = `
      SELECT 
        v.engage_type,
        v.engage_category,
        COUNT(*) as video_count,
        SUM(v.view_count) as total_views,
        AVG(v.view_count) as avg_views
      FROM youtube_videos v
      WHERE v.engage_type = $1
      GROUP BY v.engage_type, v.engage_category
      ORDER BY total_views DESC
    `;
    
    const result = await pool.query(query, [engageType]);
    
    res.json({
      success: true,
      analytics: result.rows
    });
    
  } catch (error) {
    console.error('Get videos by engage type error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get engage types
router.get('/engage-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM engage_types ORDER BY type_name');
    
    res.json({
      success: true,
      engageTypes: result.rows
    });
    
  } catch (error) {
    console.error('Get engage types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
