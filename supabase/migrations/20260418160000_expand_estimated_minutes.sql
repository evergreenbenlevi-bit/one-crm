-- Phase 1: Expand estimated_minutes CHECK to include 180 min
-- Required for size preset: big → 180 min (spec section 8)

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_estimated_minutes_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_minutes_check
  CHECK (estimated_minutes IS NULL OR estimated_minutes = ANY (ARRAY[5, 15, 30, 45, 60, 90, 120, 180]));
