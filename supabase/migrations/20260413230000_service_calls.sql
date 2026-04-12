CREATE TABLE IF NOT EXISTS service_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  call_date timestamptz DEFAULT now(),
  response_time_hours numeric,
  satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 10),
  nps_score integer CHECK (nps_score BETWEEN -100 AND 100),
  topic text,
  notes text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_calls_customer ON service_calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_calls_date ON service_calls(call_date);
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON service_calls FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
