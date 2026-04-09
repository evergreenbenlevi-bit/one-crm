-- Agent Command Center — 5 tables for managing 48+ agents, bots, crons, skills

-- 1. Agent Registry: canonical source for all agents
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('team','agent','bot','skill','cron','advisor')),
  model TEXT,
  channel TEXT,
  parent_slug TEXT,
  description TEXT,
  file_path TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Health events: each health check result
CREATE TABLE IF NOT EXISTS agent_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL REFERENCES agent_registry(slug) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down','unknown')),
  response_ms INTEGER,
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_agent_time ON agent_health_events(agent_slug, checked_at DESC);

-- 3. Token/cost tracking per agent per day
CREATE TABLE IF NOT EXISTS agent_cost_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL REFERENCES agent_registry(slug) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  cache_read_tokens BIGINT DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  UNIQUE(agent_slug, date)
);
CREATE INDEX IF NOT EXISTS idx_cost_date ON agent_cost_logs(date DESC);

-- 4. Topology edges (agent connections)
CREATE TABLE IF NOT EXISTS agent_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug TEXT NOT NULL REFERENCES agent_registry(slug) ON DELETE CASCADE,
  target_slug TEXT NOT NULL REFERENCES agent_registry(slug) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('dispatches','uses_skill','triggers_cron','monitors','feeds')),
  UNIQUE(source_slug, target_slug, relation)
);

-- 5. Agent chat sessions
CREATE TABLE IF NOT EXISTS agent_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL REFERENCES agent_registry(slug) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Self-referencing FK for parent_slug (after table exists)
ALTER TABLE agent_registry
  ADD CONSTRAINT fk_parent_slug
  FOREIGN KEY (parent_slug) REFERENCES agent_registry(slug) ON DELETE SET NULL;
