-- Phase 3 Execution Bundle — 2026-04-29
-- Run in Supabase SQL Editor (dashboard.supabase.com → SQL Editor)
-- Run each block sequentially. Re-runnable where IF NOT EXISTS is used.

-- ============================================================
-- BLOCK 1: Projects table (idempotent — IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','done','archived')),
  priority TEXT DEFAULT 'p2' CHECK (priority IN ('p1','p2','p3')),
  category TEXT,
  portfolio TEXT CHECK (portfolio IN ('one','solo','harness','exploratory')),
  owner TEXT DEFAULT 'ben' CHECK (owner IN ('ben','claude','both','evyatar')),
  position INT DEFAULT 0,
  deadline DATE,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_portfolio ON projects(portfolio);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated full access" ON projects FOR ALL
    USING (auth.role() IN ('authenticated', 'service_role'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- BLOCK 2: tasks.project_id FK (idempotent)
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ============================================================
-- BLOCK 3: Rename avitar → evyatar in enums (idempotent via DO block)
-- ============================================================
DO $$ BEGIN
  ALTER TYPE partner RENAME VALUE 'avitar' TO 'evyatar';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_owner RENAME VALUE 'avitar' TO 'evyatar';
EXCEPTION WHEN invalid_parameter_value THEN NULL;
END $$;

-- ============================================================
-- BLOCK 4: Status migration 11 → 4 values
-- + domain column
-- + drop dead triage fields
-- (from 20260426020000_phase3_schema_cleanup.sql)
-- ============================================================

-- 4a: Add domain column
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'business'
  CHECK (domain IN ('business', 'personal'));

-- 4b: Rename old enum
DO $$ BEGIN
  ALTER TYPE task_status RENAME TO task_status_old;
EXCEPTION WHEN undefined_object THEN NULL;
       WHEN duplicate_object THEN NULL;
END $$;

-- 4c: Create new 4-value enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'waiting', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4d: Add new column, map values
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_new task_status;

UPDATE tasks SET status_new =
  CASE status::text
    WHEN 'backlog'      THEN 'open'::task_status
    WHEN 'todo'         THEN 'open'::task_status
    WHEN 'inbox'        THEN 'open'::task_status
    WHEN 'up_next'      THEN 'open'::task_status
    WHEN 'scheduled'    THEN 'in_progress'::task_status
    WHEN 'in_progress'  THEN 'in_progress'::task_status
    WHEN 'waiting_ben'  THEN 'waiting'::task_status
    WHEN 'waiting'      THEN 'waiting'::task_status
    WHEN 'done'         THEN 'done'::task_status
    WHEN 'archived'     THEN 'done'::task_status
    WHEN 'someday'      THEN 'open'::task_status
    ELSE 'open'::task_status
  END
WHERE status_new IS NULL;

-- 4e: Only swap if old status column still uses old type
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
    AND udt_name = 'task_status_old'
  ) THEN
    ALTER TABLE tasks DROP COLUMN status;
    ALTER TABLE tasks RENAME COLUMN status_new TO status;
    ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'open';
    ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- 4f: Drop old enum
DROP TYPE IF EXISTS task_status_old;

-- 4g: Drop dead triage fields
DROP INDEX IF EXISTS idx_tasks_triage_pending;
ALTER TABLE tasks DROP COLUMN IF EXISTS triage_notes;
ALTER TABLE tasks DROP COLUMN IF EXISTS triage_action;
ALTER TABLE tasks DROP COLUMN IF EXISTS triaged_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS layer;

-- 4h: Index on domain
CREATE INDEX IF NOT EXISTS idx_tasks_domain ON tasks(domain);

-- ============================================================
-- BLOCK 5: Project notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated full access" ON project_notes FOR ALL
    USING (auth.role() IN ('authenticated', 'service_role'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- VERIFY (run manually after migration)
-- ============================================================
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
-- SELECT DISTINCT status FROM tasks;
-- SELECT COUNT(*) FROM projects;
-- SELECT COUNT(*) FROM project_notes;
