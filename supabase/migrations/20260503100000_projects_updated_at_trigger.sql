-- Add missing updated_at trigger on projects table
-- update_updated_at() function already exists from 001_initial_schema.sql

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
