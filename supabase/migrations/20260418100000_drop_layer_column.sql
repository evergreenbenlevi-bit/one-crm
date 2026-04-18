-- Phase 0: Drop deprecated `layer` column from tasks
-- Safe: column is unused in all live code paths

ALTER TABLE tasks DROP COLUMN IF EXISTS layer;
