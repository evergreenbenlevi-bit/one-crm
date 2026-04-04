-- Kairos-lite: Database webhook triggers for event-driven notifications
-- These triggers call the event-handler Edge Function on important CRM events

-- Enable pg_net extension for HTTP calls from DB
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: send webhook to edge function
CREATE OR REPLACE FUNCTION public.kairos_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  edge_url text;
BEGIN
  edge_url := current_setting('app.settings.supabase_url', true)
    || '/functions/v1/event-handler';

  -- Build webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Fire async HTTP POST via pg_net
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Trigger on tasks table (INSERT + UPDATE)
DROP TRIGGER IF EXISTS kairos_tasks_trigger ON public.tasks;
CREATE TRIGGER kairos_tasks_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.kairos_notify();

-- Trigger on customers table (INSERT)
DROP TRIGGER IF EXISTS kairos_customers_trigger ON public.customers;
CREATE TRIGGER kairos_customers_trigger
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.kairos_notify();

-- Trigger on applications table (INSERT) — if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS kairos_applications_trigger ON public.applications';
    EXECUTE 'CREATE TRIGGER kairos_applications_trigger
      AFTER INSERT ON public.applications
      FOR EACH ROW
      EXECUTE FUNCTION public.kairos_notify()';
  END IF;
END $$;

-- Trigger on content_ideas table (INSERT) — if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_ideas' AND table_schema = 'public') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS kairos_content_ideas_trigger ON public.content_ideas';
    EXECUTE 'CREATE TRIGGER kairos_content_ideas_trigger
      AFTER INSERT ON public.content_ideas
      FOR EACH ROW
      EXECUTE FUNCTION public.kairos_notify()';
  END IF;
END $$;

COMMENT ON FUNCTION public.kairos_notify IS 'Kairos-lite: fires async webhook to event-handler Edge Function on CRM events';
