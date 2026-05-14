-- Migration: meetings call pipeline columns
-- Plan: riki-call-debrief-architecture-2026-05-14
-- Safe: all ADD COLUMN IF NOT EXISTS, partial index for idempotency

-- Zoom identity (idempotency via partial index — Fix #2: no inline UNIQUE)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_meeting_id TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;

-- Actual timestamps
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Transcript pipeline
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT 'none'
  CHECK (transcript_status IN ('none','pending','processing','ready','failed','skipped'));
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS language_confidence NUMERIC(3,2);

-- AI extraction
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS extraction_json JSONB;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS owner TEXT
  CHECK (owner IN ('ben','evyatar','shared'));
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(3,2);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS analysis_model TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS analysis_version TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS sentiment TEXT
  CHECK (sentiment IN ('positive','neutral','negative','unknown'));
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS sentiment_confidence NUMERIC(3,2);

-- Debrief lifecycle (Fix #1: separate status field, not part of meeting_status)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS debrief_status TEXT DEFAULT 'pending'
  CHECK (debrief_status IN ('not_needed','pending','sent','confirmed','needs_manual','failed'));
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS debrief_sent_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS debrief_confirmed_at TIMESTAMPTZ;

-- Lead snapshot
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS lead_name_snapshot TEXT;

-- Error tracking (Fix #5)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Raw webhook payload (Fix #5)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB;

-- Indexes
-- Fix #2: idempotency via partial index only, no TEXT UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_external_id
  ON meetings(external_meeting_id)
  WHERE external_meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_transcript_status ON meetings(transcript_status);
CREATE INDEX IF NOT EXISTS idx_meetings_debrief_status ON meetings(debrief_status);
CREATE INDEX IF NOT EXISTS idx_meetings_started_at ON meetings(started_at);
