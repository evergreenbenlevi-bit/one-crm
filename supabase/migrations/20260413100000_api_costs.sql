-- API & Infrastructure Costs tracking
-- Tracks monthly costs per external service (Claude API, Apify, Vercel, etc.)

CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,            -- 'claude_api' | 'apify' | 'vercel' | 'youtube' | 'other'
  period TEXT NOT NULL,             -- 'YYYY-MM'
  units INTEGER,                    -- tokens / runs / calls (service-dependent)
  cost_usd NUMERIC(10, 4) NOT NULL, -- USD
  notes TEXT,
  source TEXT DEFAULT 'manual'      -- 'manual' | 'api_sync'
    CHECK (source IN ('manual', 'api_sync')),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service, period)
);

CREATE INDEX IF NOT EXISTS idx_api_costs_period ON api_costs(period DESC);
CREATE INDEX IF NOT EXISTS idx_api_costs_service ON api_costs(service);

ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON api_costs FOR ALL USING (true) WITH CHECK (true);

-- Seed current known costs (April 2026 estimates)
INSERT INTO api_costs (service, period, units, cost_usd, notes, source) VALUES
  ('claude_api',  '2026-04', NULL, 0, 'Claude API — estimate based on bot usage', 'manual'),
  ('apify',       '2026-04', NULL, 0, 'Instagram scraping — not yet active', 'manual'),
  ('vercel',      '2026-04', NULL, 0, 'ONE-CRM hosting', 'manual')
ON CONFLICT (service, period) DO NOTHING;
