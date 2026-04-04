-- Calendar queue: decouples triage from Google Calendar
-- Web app writes pending entries, cron processor creates calendar events via MCP
CREATE TABLE IF NOT EXISTS calendar_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  date text NOT NULL,           -- YYYY-MM-DD
  start_time text,              -- HH:MM (24h), null = auto-schedule by energy
  duration_minutes integer NOT NULL DEFAULT 30,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'failed', 'cancelled')),
  calendar_event_id text,       -- Google Calendar event ID once created
  error_message text,           -- If status = failed
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Index for processor to find pending entries quickly
CREATE INDEX IF NOT EXISTS idx_calendar_queue_pending ON calendar_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_calendar_queue_task ON calendar_queue(task_id);
