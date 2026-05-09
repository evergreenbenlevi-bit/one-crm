-- Phase 3 Schema Cleanup — 2026-04-26
-- Decision locked 2026-04-26: add domain field, migrate statuses to 4, drop dead fields.
-- Run via Supabase SQL Editor (do NOT run locally against prod).

-- ============================================================
-- 1. ADD domain COLUMN
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'business'
  CHECK (domain IN ('business', 'personal'));

-- ============================================================
-- 2. MIGRATE task_status enum: 11 values → 4 (open/in_progress/waiting/done)
-- Current enum: backlog, todo, in_progress, waiting_ben, done
-- (plus any legacy values that may exist as text in rows)
-- Strategy: use TEXT migration — rename type, remap rows, recreate enum, cast back.
-- ============================================================

-- Step 2a: rename old enum so we can recreate it
ALTER TYPE task_status RENAME TO task_status_old;

-- Step 2b: create new lean enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'waiting', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2c: add new column, map values, swap
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_new task_status;

UPDATE tasks SET status_new =
  CASE status::text
    WHEN 'backlog'      THEN 'open'::task_status
    WHEN 'todo'         THEN 'open'::task_status
    WHEN 'in_progress'  THEN 'in_progress'::task_status
    WHEN 'waiting_ben'  THEN 'waiting'::task_status
    WHEN 'done'         THEN 'done'::task_status
    WHEN 'archived'     THEN 'done'::task_status
    -- catch any other legacy values → open
    ELSE 'open'::task_status
  END;

-- Step 2d: drop old column, rename new
ALTER TABLE tasks DROP COLUMN IF EXISTS status;
ALTER TABLE tasks RENAME COLUMN status_new TO status;

-- Step 2e: set default + not null
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;

-- Step 2f: drop old enum type
DROP TYPE IF EXISTS task_status_old;

-- ============================================================
-- 3. DROP dead fields (triage columns)
-- ============================================================
DROP INDEX IF EXISTS idx_tasks_triage_pending;

ALTER TABLE tasks DROP COLUMN IF EXISTS triage_notes;
ALTER TABLE tasks DROP COLUMN IF EXISTS triage_action;
ALTER TABLE tasks DROP COLUMN IF EXISTS triaged_at;

-- Also soft-drop layer (was already soft-deprecated in 20260402300000)
ALTER TABLE tasks DROP COLUMN IF EXISTS layer;

-- ============================================================
-- 4. INDEX on domain
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_domain ON tasks(domain);

-- ============================================================
-- 5. VERIFY (run manually to confirm after migration)
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
-- SELECT DISTINCT status FROM tasks;
-- SELECT COUNT(*) FROM tasks WHERE domain IS NULL;
