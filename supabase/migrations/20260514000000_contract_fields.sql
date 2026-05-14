-- Contract dynamic fields for PDF generation
-- Adds fields needed to generate per-client PDF contracts

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS sessions_description text,        -- JSON or free text describing sessions
  ADD COLUMN IF NOT EXISTS payment_terms text,               -- e.g. "4 תשלומים × ₪5,500"
  ADD COLUMN IF NOT EXISTS payment_plan text,                -- e.g. "מסלול A"
  ADD COLUMN IF NOT EXISTS special_notes text,               -- free text, optional
  ADD COLUMN IF NOT EXISTS client_address text,              -- client address for contract
  ADD COLUMN IF NOT EXISTS contract_pdf_url text;            -- URL of generated PDF in Storage
