-- Phase 2: Recurring Tasks + Reminders
-- Run in Supabase Dashboard → SQL Editor

-- ─── Recurring Tasks ───
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recur_pattern TEXT DEFAULT NULL;
-- recur_pattern values: 'daily' | 'weekly:0..6' (0=Sun) | 'monthly:1..31' | 'custom:<cron>'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recur_next_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ─── Task Reminders ───
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time' | 'recurring'
  cron_expr TEXT DEFAULT NULL,           -- for recurring reminders
  message TEXT DEFAULT NULL,             -- custom message (optional)
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for reminder poller (every 5 min checks remind_at <= NOW() AND sent_at IS NULL)
CREATE INDEX IF NOT EXISTS task_reminders_pending ON task_reminders(remind_at)
  WHERE sent_at IS NULL;

-- RLS
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_reminders" ON task_reminders
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
