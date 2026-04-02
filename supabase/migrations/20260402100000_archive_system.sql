-- Replace "deleted" layer with proper archive system
-- "deleted" was confusing — it's an action, not a classification

-- Add archive columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archive_reason text;

-- Migrate tasks with layer='deleted' to archived
UPDATE tasks
SET archived_at = updated_at,
    archive_reason = 'הועבר מ-layer "מחק" (מיגרציה אוטומטית)',
    layer = NULL
WHERE layer = 'deleted';

-- Update constraint — remove 'deleted' from allowed layers
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_layer_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_layer_check
  CHECK (layer IS NULL OR layer IN ('needle_mover', 'project', 'quick_win', 'wishlist', 'nice_to_have'));

-- Index for efficient filtering of non-archived tasks
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at) WHERE archived_at IS NOT NULL;
