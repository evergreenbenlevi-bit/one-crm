-- Phase 0: Add new task management columns
-- time_slot, actual_minutes, priority_score, manually_positioned, project_id
-- project_id FK added separately after projects table created

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_slot TEXT
  CHECK (time_slot IN ('morning','afternoon','evening','any')) DEFAULT 'any';

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_score NUMERIC(6,2) DEFAULT 0;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS manually_positioned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID;
