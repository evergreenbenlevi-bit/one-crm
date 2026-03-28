-- Add new enum values for 3-pillar system
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'self';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'temp';
