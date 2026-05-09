-- Master Plan hierarchy: phase column on tasks + parent_project_id on projects
-- Created: 2026-05-05 | Plan: crm-master-tab

-- 1. Add phase grouping to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase TEXT;

-- 2. Add project hierarchy (parent → children)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);

-- 3. Extend portfolio CHECK to include benlevi-master
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_portfolio_check;
ALTER TABLE projects ADD CONSTRAINT projects_portfolio_check
  CHECK (portfolio IN ('one','solo','harness','exploratory','benlevi-master','clients'));

-- 4. Fix owner CHECK: rename avitar → evyatar (align with live API)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_check;
ALTER TABLE projects ADD CONSTRAINT projects_owner_check
  CHECK (owner IN ('ben','claude','both','evyatar'));

-- Update any existing rows with old spelling
UPDATE projects SET owner = 'evyatar' WHERE owner = 'avitar';
