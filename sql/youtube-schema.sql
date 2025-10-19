-- 🎬 YOUTUBE INTEGRATION - MODULAR SQL SCHEMA

-- YouTube Accounts (channels)
CREATE TABLE youtube_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID,                    -- optional: link to your internal user
  google_user_id VARCHAR(64),      -- from Google's profile info (sub)
  channel_id VARCHAR(64) UNIQUE,   -- YouTube channel ID (e.g., UCabc12345xyz)
  channel_title VARCHAR(255),
  channel_description TEXT,
  channel_thumbnail VARCHAR(500),
  subscriber_count INTEGER DEFAULT 0,
  view_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_scope TEXT,
  token_type VARCHAR(32),
  token_expiry TIMESTAMP,
  
  -- Metadata
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_youtube_accounts_user_id (user_id),
  INDEX idx_youtube_accounts_channel_id (channel_id),
  INDEX idx_youtube_accounts_google_user_id (google_user_id)
);

-- YouTube Playlists (for organization)
CREATE TABLE youtube_playlists (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES youtube_accounts(id) ON DELETE CASCADE,
  playlist_id VARCHAR(64) UNIQUE,  -- YouTube playlist ID
  title VARCHAR(255),
  description TEXT,
  thumbnail VARCHAR(500),
  item_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_youtube_playlists_account_id (account_id),
  INDEX idx_youtube_playlists_playlist_id (playlist_id)
);

-- YouTube Videos (junction table with Engage categorization)
CREATE TABLE youtube_videos (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES youtube_accounts(id) ON DELETE CASCADE,
  playlist_id INTEGER REFERENCES youtube_playlists(id) ON DELETE SET NULL,
  
  -- YouTube video data
  video_id VARCHAR(64) UNIQUE,     -- YouTube video ID
  title VARCHAR(255),
  description TEXT,
  thumbnail VARCHAR(500),
  duration VARCHAR(20),            -- ISO 8601 duration (PT4M13S)
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  privacy_status VARCHAR(20) DEFAULT 'public', -- public, unlisted, private
  
  -- 🎯 ENGAGE CATEGORIZATION (the magic!)
  engage_id VARCHAR(64),            -- ID of the engagement (event, campaign, etc.)
  engage_type VARCHAR(50),          -- Type: 'event', 'campaign', 'member_story', 'challenge', etc.
  engage_category VARCHAR(50),      -- Category: 'recruitment', 'engagement', 'retention', etc.
  
  -- Upload metadata
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for fast queries
  INDEX idx_youtube_videos_account_id (account_id),
  INDEX idx_youtube_videos_playlist_id (playlist_id),
  INDEX idx_youtube_videos_video_id (video_id),
  INDEX idx_youtube_videos_engage (engage_id, engage_type),
  INDEX idx_youtube_videos_category (engage_category),
  INDEX idx_youtube_videos_uploaded (uploaded_at)
);

-- YouTube Analytics (optional - for tracking performance)
CREATE TABLE youtube_analytics (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES youtube_videos(id) ON DELETE CASCADE,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  
  -- Engagement rates
  click_through_rate DECIMAL(5,4) DEFAULT 0.0000,
  engagement_rate DECIMAL(5,4) DEFAULT 0.0000,
  
  -- Date
  recorded_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_youtube_analytics_video_id (video_id),
  INDEX idx_youtube_analytics_recorded (recorded_at)
);

-- 🎯 ENGAGE TYPES REFERENCE (for consistency)
CREATE TABLE engage_types (
  id SERIAL PRIMARY KEY,
  type_name VARCHAR(50) UNIQUE,
  description TEXT,
  category VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default engage types
INSERT INTO engage_types (type_name, description, category) VALUES
('event', 'Event-related videos', 'engagement'),
('campaign', 'Marketing campaign videos', 'recruitment'),
('member_story', 'Member transformation stories', 'engagement'),
('challenge', 'Member challenges and goals', 'engagement'),
('training', 'Educational content', 'retention'),
('announcement', 'Organization announcements', 'communication'),
('recruitment', 'Recruitment and onboarding', 'recruitment'),
('retention', 'Member retention content', 'retention');
