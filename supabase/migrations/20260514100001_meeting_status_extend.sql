-- Migration: extend meeting_status ENUM
-- Fix #3: extend only — no TEXT conversion
-- Result: scheduled | completed | cancelled | no_show | completed_no_recording
-- IMPORTANT: Must run standalone (not inside a transaction block) — Postgres ENUM ADD VALUE constraint

ALTER TYPE meeting_status ADD VALUE IF NOT EXISTS 'completed_no_recording';
