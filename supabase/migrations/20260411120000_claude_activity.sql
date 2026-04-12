-- Claude Activity Log — multi-session real-time tracking
-- Each CC session writes every action here for cross-session visibility

CREATE TABLE IF NOT EXISTS claude_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('session_start', 'prompt', 'tool_use', 'session_end')),
  summary text,
  file_path text,
  tool_name text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_claude_activity_session ON claude_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_activity_created ON claude_activity(created_at DESC);

ALTER TABLE claude_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read all" ON claude_activity FOR SELECT USING (true);
CREATE POLICY "service insert" ON claude_activity FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE claude_activity;
