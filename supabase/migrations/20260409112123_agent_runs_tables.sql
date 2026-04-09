-- Agent runs: tracks each agent execution
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug text NOT NULL,
  trace_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_trace_id uuid,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_ms int,
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  status text DEFAULT 'running',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tool calls within a run
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  success boolean DEFAULT true,
  duration_ms int,
  called_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_slug ON agent_runs(agent_slug);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_trace ON agent_runs(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_parent_trace ON agent_runs(parent_trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_run ON agent_tool_calls(run_id);

-- RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent_runs" ON agent_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert agent_runs" ON agent_runs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Authenticated users can read agent_tool_calls" ON agent_tool_calls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert agent_tool_calls" ON agent_tool_calls
  FOR INSERT TO service_role WITH CHECK (true);
