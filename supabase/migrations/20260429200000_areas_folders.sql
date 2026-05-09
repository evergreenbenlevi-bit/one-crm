-- areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  color text DEFAULT '#6366f1',
  position int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  position int NOT NULL DEFAULT 0,
  href text, -- optional direct link (e.g. /creator-intel)
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(area_id, slug)
);

-- Add folder_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_folder_id ON tasks(folder_id);

-- Seed Areas
INSERT INTO areas (name, slug, icon, color, position) VALUES
  ('EDEN™', 'one', 'Briefcase', '#6366f1', 0),
  ('Self', 'self', 'User', '#10b981', 1),
  ('Brand', 'brand', 'Megaphone', '#f59e0b', 2),
  ('Ops', 'ops', 'Settings', '#6b7280', 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed Folders
INSERT INTO folders (area_id, name, slug, href, position)
SELECT a.id, f.name, f.slug, f.href, f.position
FROM areas a
JOIN (VALUES
  ('one', 'Course', 'course', '/course-builder', 0),
  ('one', 'Launch', 'launch', '/campaigns', 1),
  ('one', 'CRM', 'crm', '/leads', 2),
  ('one', 'Portal', 'portal', null, 3),
  ('brand', 'Content', 'content', '/content', 0),
  ('brand', 'Creator Intel', 'creator-intel', '/creator-intel', 1),
  ('brand', 'Campaigns', 'campaigns', '/campaigns', 2),
  ('brand', 'Media', 'media', null, 3),
  ('self', 'Tasks', 'tasks', '/tasks', 0),
  ('self', 'Projects', 'projects', '/projects', 1),
  ('self', 'Fitness', 'fitness', '/fitness', 2),
  ('self', 'Finance', 'finance', '/financial', 3),
  ('ops', 'Triage', 'triage', '/triage', 0),
  ('ops', 'Dump', 'dump', '/dump', 1),
  ('ops', 'Agents', 'agents', '/agents', 2),
  ('ops', 'Settings', 'settings', '/settings', 3)
) AS f(area_slug, name, slug, href, position)
ON a.slug = f.area_slug
ON CONFLICT (area_id, slug) DO NOTHING;
