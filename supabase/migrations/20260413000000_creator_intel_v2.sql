-- Creator Intel V2 — Phase 1 migration
-- Adds: format_type, domain, thumbnail_url, example_posts, vault_path, metrics fields
-- youtube_channel_id, instagram_username, analysis_status, last_synced_at

-- 1. Extend creators table
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'short_form'
    CHECK (format_type IN ('short_form', 'long_form', 'both')),
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'other'
    CHECK (domain IN ('manifesto', 'ai_tech', 'business', 'personal', 'production', 'other')),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS example_posts JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS vault_path TEXT,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'none'
    CHECK (analysis_status IN ('none', 'partial', 'full')),
  ADD COLUMN IF NOT EXISTS follower_count INTEGER,
  ADD COLUMN IF NOT EXISTS avg_views INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_rate FLOAT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. Extend creator_snapshots table
ALTER TABLE creator_snapshots
  ADD COLUMN IF NOT EXISTS avg_views INTEGER,
  ADD COLUMN IF NOT EXISTS top_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS top_video_url TEXT,
  ADD COLUMN IF NOT EXISTS top_video_title TEXT,
  ADD COLUMN IF NOT EXISTS top_video_views INTEGER;

-- 3. Extend viral_scans table
ALTER TABLE viral_scans
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'short_form'
    CHECK (format_type IN ('short_form', 'long_form'));

-- 4. Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_creators_domain ON creators(domain) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_creators_format ON creators(format_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_creators_analysis ON creators(analysis_status) WHERE active = true;
