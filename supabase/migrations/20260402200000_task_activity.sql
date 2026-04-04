-- Task activity/conversation log
-- Every change, note, and milestone is recorded here
CREATE TABLE IF NOT EXISTS task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'note',           -- manual note/comment
    'status_change',  -- status field changed
    'field_change',   -- any other field changed
    'created',        -- task was created
    'completed',      -- task marked as done (includes summary)
    'archived'        -- task was archived (includes reason)
  )),
  actor text NOT NULL DEFAULT 'system' CHECK (actor IN ('ben', 'claude', 'system')),
  content text,       -- note text, completion summary, or change description
  field_name text,    -- which field changed (for field_change/status_change)
  old_value text,     -- previous value
  new_value text,     -- new value
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created ON task_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_type ON task_activity(activity_type);

-- RLS policies
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on task_activity') THEN
    CREATE POLICY "Service role full access on task_activity"
      ON task_activity FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
