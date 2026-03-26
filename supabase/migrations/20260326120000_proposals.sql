-- Proposals table for tracking client proposals lifecycle
-- Status flow: draft → sent → viewed → signed | rejected

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  -- Proposal details
  title text NOT NULL,                          -- e.g. "הצעה ל-[שם לקוח]"
  program text,                                 -- 'standard_6m', 'standard_3m', 'premium_6m'
  amount numeric(10,2),                         -- total investment
  payment_structure text,                       -- e.g. '3 תשלומים', 'תשלום אחד'

  -- Lifecycle tracking
  status proposal_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,

  -- Document storage
  file_path text,                               -- path in vault: _SCRATCH/drafts/proposal-[name]-[date].md

  -- Metadata
  notes text,
  expires_at timestamptz,                       -- proposal expiry (default: sent_at + 14 days)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS proposals_lead_id_idx ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS proposals_customer_id_idx ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_proposals_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users full access on proposals"
    ON proposals FOR ALL
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on proposals"
    ON proposals FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
