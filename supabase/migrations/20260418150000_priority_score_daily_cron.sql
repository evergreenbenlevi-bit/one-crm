-- Phase 0: Daily priority_score recompute cron setup
-- pg_cron extension not available on this Supabase plan.
-- recompute_all_priority_scores() function created in previous migration.
-- Daily trigger wired via: POST /api/cron/recompute-scores (Next.js route)
-- Schedule: 06:00 daily via LaunchAgent ~/.claude/launchd/one-crm-priority-recompute.plist

-- This migration is a no-op placeholder — documents the cron strategy.
-- To manually trigger recompute: SELECT recompute_all_priority_scores();

DO $$ BEGIN
  RAISE NOTICE 'Daily priority_score recompute: call recompute_all_priority_scores() via API or cron. pg_cron not available.';
END $$;
