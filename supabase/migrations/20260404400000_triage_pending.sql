-- Add triage pending flow columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS triage_action text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS triage_notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS triaged_at timestamptz;

-- Index for batch processing: find all pending triage items
CREATE INDEX IF NOT EXISTS idx_tasks_triage_pending
  ON tasks (triaged_at)
  WHERE triage_action IS NOT NULL AND status != 'done' AND status != 'archived';

COMMENT ON COLUMN tasks.triage_action IS 'Action chosen by Ben in triage UI: claude|ben|done|delete|confirm|skip';
COMMENT ON COLUMN tasks.triage_notes IS 'Free text notes Ben added during triage';
COMMENT ON COLUMN tasks.triaged_at IS 'When Ben triaged this task (NULL = not yet triaged)';
