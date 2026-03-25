-- Task Manager Module for ONE™ CRM
-- Added: 2026-03-18

-- ENUMS (idempotent)
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('p1', 'p2', 'p3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'waiting_ben', 'done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_owner AS ENUM ('claude', 'ben', 'both', 'avitar'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_category AS ENUM ('one_tm', 'infrastructure', 'personal', 'research', 'content'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'p2',
  status task_status DEFAULT 'todo',
  owner task_owner DEFAULT 'claude',
  category task_category DEFAULT 'one_tm',
  due_date date,
  depends_on uuid REFERENCES tasks(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  source text, -- 'kanban', 'dashboard', 'braindump', 'conversation'
  source_date date,
  completed_at timestamptz,
  position integer DEFAULT 0, -- for ordering within a column
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(status, position);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users full access" ON tasks FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON tasks FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AUTO SET completed_at
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF new.status = 'done' AND old.status != 'done' THEN
    new.completed_at = now();
  END IF;
  IF new.status != 'done' THEN
    new.completed_at = null;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_task_completed BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_completed_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
