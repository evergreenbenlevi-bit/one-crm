-- Course Builder: levels + modules for ONE™ course production
-- Used by /course-builder page for Ben & Avitar to plan, edit, track course content

CREATE TABLE IF NOT EXISTS course_levels (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  color TEXT NOT NULL DEFAULT '#666',
  hex TEXT NOT NULL DEFAULT '#666666',
  total_modules INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  phase TEXT,
  weeks TEXT,
  posi TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id TEXT NOT NULL REFERENCES course_levels(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  script TEXT,
  teacher TEXT CHECK (teacher IN ('ben', 'avitar', 'both')) DEFAULT 'ben',
  source TEXT CHECK (source IN ('tom', 'tom_modified', 'original', 'removed')) DEFAULT 'tom',
  source_refs TEXT,
  format TEXT,
  posi TEXT,
  client_benefit TEXT,

  -- checklist fields
  script_ready BOOLEAN NOT NULL DEFAULT false,
  playbook_ready BOOLEAN NOT NULL DEFAULT false,
  banner_ready BOOLEAN NOT NULL DEFAULT false,
  filmed BOOLEAN NOT NULL DEFAULT false,
  edited BOOLEAN NOT NULL DEFAULT false,
  uploaded BOOLEAN NOT NULL DEFAULT false,
  posi_defined BOOLEAN NOT NULL DEFAULT false,

  -- status
  status TEXT CHECK (status IN ('draft', 'ready_to_film', 'filmed', 'edited', 'live', 'removed')) NOT NULL DEFAULT 'draft',

  -- links
  playbook_url TEXT,
  gamma_url TEXT,
  video_url TEXT,

  -- ordering
  position INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_modules_level ON course_modules(level_id);
CREATE INDEX idx_course_modules_status ON course_modules(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_course_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_levels_updated
  BEFORE UPDATE ON course_levels
  FOR EACH ROW EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER course_modules_updated
  BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_course_updated_at();
