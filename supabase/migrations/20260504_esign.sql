-- E-Sign: DocuSeal integration columns + audit log
-- Phase 1 of esign-full-build-2026-05-04.md

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS docuseal_submission_id text,
  ADD COLUMN IF NOT EXISTS docuseal_document_url text,
  ADD COLUMN IF NOT EXISTS signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS signer_ip text,
  ADD COLUMN IF NOT EXISTS signer_user_agent text,
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS otp_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signing_token uuid DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS esign_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb
);

ALTER TABLE esign_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth full access" ON esign_audit_log
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "service full access" ON esign_audit_log
  FOR ALL USING (auth.role() = 'service_role');
