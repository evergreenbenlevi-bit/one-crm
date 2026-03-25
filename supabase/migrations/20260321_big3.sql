-- BIG 3 Weekly Projects System
-- Added: 2026-03-21

-- Weekly strategic projects (max 3 per week)
CREATE TABLE big3_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  week_start date NOT NULL,           -- Monday of the week
  name text NOT NULL,
  description text,
  why_now text,
  success_definition text,
  type text CHECK (type IN ('needle_mover', 'build', 'maintenance')) DEFAULT 'needle_mover',
  position int DEFAULT 1,             -- 1, 2, 3
  created_at timestamptz DEFAULT now()
);

-- Sub-tasks for each BIG 3 project
CREATE TABLE big3_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES big3_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  estimated_minutes int,
  scheduled_date date,                -- which day this task is planned for
  completed boolean DEFAULT false,
  completed_at timestamptz,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_big3_projects_week ON big3_projects(week_start);
CREATE INDEX idx_big3_projects_user ON big3_projects(user_id);
CREATE INDEX idx_big3_tasks_project ON big3_tasks(project_id);
CREATE INDEX idx_big3_tasks_date ON big3_tasks(scheduled_date);

-- RLS
ALTER TABLE big3_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE big3_tasks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write their own data
CREATE POLICY "Authenticated full access" ON big3_projects
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access" ON big3_projects
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated full access" ON big3_tasks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access" ON big3_tasks
  FOR ALL USING (auth.role() = 'service_role');
