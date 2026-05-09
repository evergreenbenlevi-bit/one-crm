-- Creator Intel — lobstr.io + AssemblyAI migration
-- Adds video_url (from lobstr.io CDN) and transcript (from AssemblyAI) to viral_scans

ALTER TABLE viral_scans
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN viral_scans.video_url IS 'Direct CDN video URL from lobstr.io — expires ~24-48h. Transcribe immediately.';
COMMENT ON COLUMN viral_scans.transcript IS 'Full speech transcript from AssemblyAI. Only populated for top reel per creator per run.';

CREATE INDEX IF NOT EXISTS idx_viral_transcript ON viral_scans(id) WHERE transcript IS NOT NULL;
