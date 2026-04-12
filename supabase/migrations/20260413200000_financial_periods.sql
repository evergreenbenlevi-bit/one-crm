-- Financial Periods: Monthly P&L snapshots with Israeli tax formulas
-- VAT 18% (included in price), Income Tax 23%
-- Phase B1: CRM Redesign V2

CREATE TABLE IF NOT EXISTS financial_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text NOT NULL UNIQUE,               -- '2026-04'
  gross_revenue numeric DEFAULT 0,           -- total revenue incl. VAT
  total_expenses_ex_vat numeric DEFAULT 0,   -- expenses before VAT
  vat_input numeric DEFAULT 0,               -- VAT paid on inputs (expenses)
  payroll_expenses numeric DEFAULT 0,        -- salaries + freelancers
  advance_tax_payments numeric DEFAULT 0,    -- מקדמות
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add computed/stored columns (Postgres doesn't support multiple generated cols in CREATE TABLE easily)
ALTER TABLE financial_periods
  ADD COLUMN IF NOT EXISTS vat_collected numeric GENERATED ALWAYS AS (gross_revenue * 0.18 / 1.18) STORED,
  ADD COLUMN IF NOT EXISTS revenue_ex_vat numeric GENERATED ALWAYS AS (gross_revenue / 1.18) STORED,
  ADD COLUMN IF NOT EXISTS vat_net numeric GENERATED ALWAYS AS ((gross_revenue * 0.18 / 1.18) - vat_input) STORED,
  ADD COLUMN IF NOT EXISTS operating_profit numeric GENERATED ALWAYS AS ((gross_revenue / 1.18) - total_expenses_ex_vat) STORED,
  ADD COLUMN IF NOT EXISTS profit_before_tax numeric GENERATED ALWAYS AS ((gross_revenue / 1.18) - total_expenses_ex_vat - payroll_expenses) STORED,
  ADD COLUMN IF NOT EXISTS income_tax numeric GENERATED ALWAYS AS (GREATEST(0, (gross_revenue / 1.18) - total_expenses_ex_vat - payroll_expenses) * 0.23) STORED,
  ADD COLUMN IF NOT EXISTS net_profit numeric GENERATED ALWAYS AS (GREATEST(0, (gross_revenue / 1.18) - total_expenses_ex_vat - payroll_expenses) * 0.77) STORED,
  ADD COLUMN IF NOT EXISTS advance_tax_30pct numeric GENERATED ALWAYS AS (advance_tax_payments * 0.3) STORED,
  ADD COLUMN IF NOT EXISTS net_to_transfer numeric GENERATED ALWAYS AS (advance_tax_payments - (advance_tax_payments * 0.3)) STORED;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_periods_period ON financial_periods(period);

-- RLS
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON financial_periods FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
