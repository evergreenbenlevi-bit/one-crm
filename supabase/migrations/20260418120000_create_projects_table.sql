-- Phase 0: Create projects table (first-class, not parent tasks)

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','done','archived')),
  priority TEXT DEFAULT 'p2' CHECK (priority IN ('p1','p2','p3')),
  category TEXT,
  portfolio TEXT CHECK (portfolio IN ('one','solo','harness','exploratory')),
  owner TEXT DEFAULT 'ben' CHECK (owner IN ('ben','claude','both','avitar')),
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
CREATE POLICY "Authenticated full access" ON projects FOR ALL
  USING (auth.role() IN ('authenticated', 'service_role'));
