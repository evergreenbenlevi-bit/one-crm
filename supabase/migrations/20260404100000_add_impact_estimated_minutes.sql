-- Task Management OS: add impact, size, estimated_minutes columns
-- impact + size were referenced in code/UI but never added to DB (data loss bug)
-- estimated_minutes replaces the vague size concept with actual time estimates

-- 1. Add impact column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS impact text
  CHECK (impact IS NULL OR impact IN ('needle_mover', 'important', 'nice'));

-- 2. Add size column (unblocks existing UI that already uses it)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS size text
  CHECK (size IS NULL OR size IN ('quick', 'medium', 'big'));

-- 3. Add estimated_minutes column (precise duration for scheduling)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes integer
  CHECK (estimated_minutes IS NULL OR estimated_minutes IN (5, 15, 30, 45, 60, 90, 120));

-- 4. Backfill impact from priority
UPDATE tasks SET impact = 'needle_mover' WHERE priority = 'p1' AND impact IS NULL;
UPDATE tasks SET impact = 'important' WHERE priority = 'p2' AND impact IS NULL;
UPDATE tasks SET impact = 'nice' WHERE priority = 'p3' AND impact IS NULL;

-- 5. Backfill estimated_minutes from effort
UPDATE tasks SET estimated_minutes = 5 WHERE effort = 'quick' AND estimated_minutes IS NULL;
UPDATE tasks SET estimated_minutes = 30 WHERE effort = 'small' AND estimated_minutes IS NULL;
UPDATE tasks SET estimated_minutes = 60 WHERE effort = 'medium' AND estimated_minutes IS NULL;
UPDATE tasks SET estimated_minutes = 120 WHERE effort = 'large' AND estimated_minutes IS NULL;

-- 6. Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_impact ON tasks(impact) WHERE impact IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_minutes ON tasks(estimated_minutes) WHERE estimated_minutes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id) WHERE parent_id IS NOT NULL;
