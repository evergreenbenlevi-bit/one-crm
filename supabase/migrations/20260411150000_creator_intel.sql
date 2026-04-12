-- Creator Intelligence — 4 tables for Track 1 (modeling) + Track 2 (viral scan) + verification queue
-- Part of Creator Leaderboard Dashboard project (BRIEF: 08_TASKS/PROJECTS/CREATOR-LEADERBOARD-BRIEF.md)

-- 1. Creators: curated list Ben is modeling (Track 1)
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','instagram')),
  niche TEXT NOT NULL CHECK (niche IN ('business_coach','ai_creator','confessional','other')),
  display_name TEXT,
  profile_url TEXT,
  channel_id TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(handle, platform)
);
CREATE INDEX IF NOT EXISTS idx_creators_niche ON creators(niche) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform) WHERE active = true;

-- 2. Creator Snapshots: time-series weekly measurements (ground truth)
CREATE TABLE IF NOT EXISTS creator_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  week TEXT NOT NULL,
  followers INTEGER,
  followers_delta_7d INTEGER,
  followers_delta_30d INTEGER,
  posts_count_7d INTEGER,
  top_posts JSONB DEFAULT '[]',
  engagement_ratio FLOAT,
  captured_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, week)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_creator_week ON creator_snapshots(creator_id, week DESC);

-- 3. Creator Watching Queue: 2-week verification buffer before promotion to Track 1
CREATE TABLE IF NOT EXISTS creator_watching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','instagram')),
  niche TEXT,
  discovered_via TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  snapshots_count INTEGER DEFAULT 0,
  our_velocity_7d FLOAT,
  our_velocity_14d FLOAT,
  followers_at_discovery INTEGER,
  followers_latest INTEGER,
  status TEXT DEFAULT 'watching' CHECK (status IN ('watching','promoted','rejected','suspicious')),
  promoted_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(handle, platform)
);
CREATE INDEX IF NOT EXISTS idx_watching_status ON creator_watching_queue(status);

-- 4. Viral Scans: Track 2 — global viral content discovery feed
CREATE TABLE IF NOT EXISTS viral_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week TEXT NOT NULL,
  niche TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','instagram')),
  post_url TEXT NOT NULL,
  creator_handle TEXT,
  creator_followers INTEGER,
  title TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  engagement_ratio FLOAT,
  viral_score FLOAT,
  hook_text TEXT,
  hook_score FLOAT,
  fastest_growing_tag BOOLEAN DEFAULT false,
  captured_at TIMESTAMPTZ DEFAULT now(),
  ben_action TEXT DEFAULT 'none' CHECK (ben_action IN ('none','saved','repurpose','dismiss')),
  repurpose_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE(post_url)
);
CREATE INDEX IF NOT EXISTS idx_viral_week_niche ON viral_scans(week, niche);
CREATE INDEX IF NOT EXISTS idx_viral_score ON viral_scans(viral_score DESC) WHERE ben_action = 'none';

-- RLS (permissive for now — single-user CRM)
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_watching_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON creators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON creator_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON creator_watching_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON viral_scans FOR ALL USING (true) WITH CHECK (true);
