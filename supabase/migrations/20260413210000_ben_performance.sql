-- Ben's own performance snapshots (Phase C1 — CRM Redesign V2)
-- Stores Ben's YouTube + Instagram posts for comparison alongside creator grid

CREATE TABLE IF NOT EXISTS ben_performance_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram')),
  week text NOT NULL,                     -- ISO week label: '2026-W15'
  post_url text,
  video_id text,                          -- YouTube video ID or IG shortcode
  title text,
  thumbnail_url text,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  reach integer DEFAULT 0,
  publish_date date,
  captured_at timestamptz DEFAULT now(),
  UNIQUE (platform, video_id, week)
);

-- Index for efficient dashboard queries
CREATE INDEX IF NOT EXISTS idx_ben_perf_platform_week ON ben_performance_snapshots(platform, week);
CREATE INDEX IF NOT EXISTS idx_ben_perf_publish_date ON ben_performance_snapshots(publish_date);

-- RLS
ALTER TABLE ben_performance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON ben_performance_snapshots FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
