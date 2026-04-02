-- Replace layer (mixed dimensions) with effort (single dimension: how long does this take?)
-- Priority already covers impact (p1=needle mover, p2=important, p3=nice to have)
-- Effort covers size: quick (≤5min), small (≤1hr), medium (≤1 day), large (multi-day project)

-- Add effort column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort text
  CHECK (effort IS NULL OR effort IN ('quick', 'small', 'medium', 'large'));

-- Migrate existing layer data to effort
-- quick_win → quick
UPDATE tasks SET effort = 'quick' WHERE layer = 'quick_win';
-- project → large
UPDATE tasks SET effort = 'large' WHERE layer = 'project' OR layer = 'needle_mover';
-- wishlist/nice_to_have → keep null (will be triaged)
-- nice_to_have → small (default assumption)
UPDATE tasks SET effort = 'small' WHERE layer = 'nice_to_have' AND effort IS NULL;
UPDATE tasks SET effort = 'small' WHERE layer = 'wishlist' AND effort IS NULL;

-- Drop layer constraint and column
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_layer_check;
-- Keep layer column for now (soft deprecation) but nullable
-- We don't drop it to avoid breaking any remaining references

-- Index on effort for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_effort ON tasks(effort) WHERE effort IS NOT NULL;
