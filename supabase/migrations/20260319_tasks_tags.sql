-- Add tags array to tasks table
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}' NOT NULL;

-- Index for tag queries (optional, improves filter performance)
CREATE INDEX IF NOT EXISTS tasks_tags_gin ON tasks USING gin(tags);
