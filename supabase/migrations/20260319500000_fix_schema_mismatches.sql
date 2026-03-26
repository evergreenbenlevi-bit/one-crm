-- Fix schema mismatches between DB and application code
-- Created: 2026-03-19

-- 1. Add 'program' column to leads (mirrors interest_program for app compatibility)
--    The app uses 'program', n8n uses 'interest_program'. We add 'program' and sync.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS program program_type;
UPDATE leads SET program = interest_program WHERE program IS NULL AND interest_program IS NOT NULL;

-- 2. Extend funnel_event_type enum to include values the app sends
--    DB had: viewed_content, engaged_dm, visited_offer_doc, applied, qualified, started_onboarding, purchased, completed_program
--    App sends: registered, consumed_content, engaged
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'registered';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'consumed_content';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'engaged';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'active_client';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE funnel_event_type ADD VALUE IF NOT EXISTS 'lost';

-- 3. Extend lead_source enum with missing values used in n8n
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'instagram' ;
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'linkedin';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'content';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'webinar';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'skool';

-- 4. Add index on the new program column
CREATE INDEX IF NOT EXISTS idx_leads_program_col ON leads(program);

-- 5. Add trigger to keep program and interest_program in sync going forward
CREATE OR REPLACE FUNCTION sync_lead_program()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.program IS NOT NULL AND NEW.interest_program IS NULL THEN
    NEW.interest_program := NEW.program;
  ELSIF NEW.interest_program IS NOT NULL AND NEW.program IS NULL THEN
    NEW.program := NEW.interest_program;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_sync_program ON leads;
CREATE TRIGGER leads_sync_program
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION sync_lead_program();
