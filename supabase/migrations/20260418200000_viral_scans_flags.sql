-- Viral Scans — LIFETIME + 7-day flags
-- is_lifetime_top5: true = this post is in creator's all-time top 5 by views
-- is_7day_best: true = this post was captured within the last 7 days

ALTER TABLE viral_scans
  ADD COLUMN IF NOT EXISTS is_lifetime_top5 BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_7day_best BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_viral_lifetime ON viral_scans(is_lifetime_top5) WHERE is_lifetime_top5 = true;
CREATE INDEX IF NOT EXISTS idx_viral_7day ON viral_scans(is_7day_best) WHERE is_7day_best = true;
