-- CFO System: Partner expense tracking, settlements, and financial snapshots
-- Adds partner tracking to expenses + 2 new tables

-- 1. Partner enum
DO $$ BEGIN CREATE TYPE partner AS ENUM ('ben', 'avitar', 'shared'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Settlement status enum
DO $$ BEGIN CREATE TYPE settlement_status AS ENUM ('pending', 'settled', 'disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend expenses table with partner tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by partner NOT NULL DEFAULT 'shared';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_ratio numeric(3,2) DEFAULT 0.50;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes text;

-- 4. Add missing expense categories
DO $$
BEGIN
  ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'content_creation';
  ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'coaching_tools';
  ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'education';
  ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'skool';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Index on paid_by for partner filtering
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);

-- 6. Partner settlements table
CREATE TABLE IF NOT EXISTS partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  ben_total numeric(10,2) NOT NULL DEFAULT 0,
  avitar_total numeric(10,2) NOT NULL DEFAULT 0,
  ben_share numeric(10,2) NOT NULL DEFAULT 0,
  avitar_share numeric(10,2) NOT NULL DEFAULT 0,
  settlement_amount numeric(10,2) NOT NULL DEFAULT 0,
  status settlement_status DEFAULT 'pending',
  settled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_period ON partner_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON partner_settlements(status);

-- RLS
ALTER TABLE partner_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON partner_settlements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access" ON partner_settlements FOR ALL USING (auth.role() = 'service_role');

-- 7. Financial snapshots table (monthly/quarterly P&L)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  type text NOT NULL CHECK (type IN ('monthly', 'quarterly')),
  revenue_total numeric(10,2) DEFAULT 0,
  revenue_one_core numeric(10,2) DEFAULT 0,
  revenue_one_vip numeric(10,2) DEFAULT 0,
  expenses_total numeric(10,2) DEFAULT 0,
  expenses_by_category jsonb DEFAULT '{}',
  profit numeric(10,2) DEFAULT 0,
  roi numeric(5,2) DEFAULT 0,
  meta_spend numeric(10,2) DEFAULT 0,
  ben_paid numeric(10,2) DEFAULT 0,
  avitar_paid numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(period, type)
);

-- RLS
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON financial_snapshots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access" ON financial_snapshots FOR ALL USING (auth.role() = 'service_role');
