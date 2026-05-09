-- Migration: Add needs_review column to expenses table
-- Created: 2026-04-20
-- Purpose: Flag expenses that need manual review (e.g., zero-amount rows from failed extraction)

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;

-- Backfill: mark any existing zero-amount rows as needing review
UPDATE expenses SET needs_review = TRUE WHERE amount = 0 OR amount IS NULL;
