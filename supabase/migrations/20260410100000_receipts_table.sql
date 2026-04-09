-- Receipts tracking + accountant audit trail
-- Links receipts to expenses, tracks what was sent to accountant (amir@cpa-gm.com)

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  source_email_id text,
  vendor text,
  amount numeric(10,2),
  receipt_date date,
  file_url text,
  sent_to_accountant boolean DEFAULT false,
  sent_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_expense_id ON receipts(expense_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sent ON receipts(sent_to_accountant);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date);

-- RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users full access" ON receipts FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON receipts FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
