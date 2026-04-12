-- Phase 6: Thumbnail Intelligence
-- Adds pattern_notes field to creators table for per-creator pattern analysis

ALTER TABLE creators ADD COLUMN IF NOT EXISTS pattern_notes TEXT;

COMMENT ON COLUMN creators.pattern_notes IS 'Manual pattern analysis — what works visually for this creator (thumbnails, hooks, format)';
