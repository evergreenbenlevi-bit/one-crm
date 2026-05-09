-- Add 'friday' category to task_category enum
-- Purpose: weekly Friday review bucket for manual personal action items
-- Created: 2026-04-30
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'friday';
