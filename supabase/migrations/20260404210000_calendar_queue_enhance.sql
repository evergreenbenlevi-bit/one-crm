-- Enhance calendar_queue for Phase 2: travel blocks, attendees, event types
ALTER TABLE calendar_queue
  ADD COLUMN IF NOT EXISTS attendee_email text,
  ADD COLUMN IF NOT EXISTS travel_minutes integer,
  ADD COLUMN IF NOT EXISTS is_travel_block boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'task' CHECK (event_type IN ('task', 'travel', 'meeting'));
