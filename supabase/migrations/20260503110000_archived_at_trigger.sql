-- Auto-set archived_at when task status changes to 'archived'
-- update_updated_at() function already exists; adding a dedicated archived_at trigger

CREATE OR REPLACE FUNCTION set_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    NEW.archived_at = now();
  ELSIF NEW.status != 'archived' AND OLD.status = 'archived' THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_archived_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_archived_at();
