-- Migration 002: Add missing WHOOP columns to daily_stats
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/acqqkgzxkxocftkbyvur/sql/new
-- These columns capture data from the /cycle endpoint (available on trialing tier)

ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS whoop_avg_hr SMALLINT,
  ADD COLUMN IF NOT EXISTS whoop_max_hr SMALLINT,
  ADD COLUMN IF NOT EXISTS whoop_kcal   INTEGER;

COMMENT ON COLUMN daily_stats.whoop_avg_hr IS 'Average heart rate during cycle (bpm)';
COMMENT ON COLUMN daily_stats.whoop_max_hr IS 'Max heart rate during cycle (bpm)';
COMMENT ON COLUMN daily_stats.whoop_kcal   IS 'Calories burned (converted from kilojoules: kJ × 0.239)';
