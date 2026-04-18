-- Phase 0: priority_score compute function + trigger
-- Algorithm: deadline 40% + impact 35% + size 25% (as multiplier)
-- Overdue tasks (past deadline, not done) get +1000 to float to top

CREATE OR REPLACE FUNCTION compute_priority_score(
  p_due_date DATE,
  p_impact TEXT,
  p_size TEXT,
  p_status TEXT DEFAULT NULL
) RETURNS NUMERIC(6,2) AS $$
DECLARE
  v_days_until INTEGER;
  v_deadline_urgency NUMERIC;  -- 0-10
  v_impact_points NUMERIC;     -- 0-10
  v_size_multiplier NUMERIC;   -- 0.9-1.2
  v_base_score NUMERIC;
BEGIN
  -- Deadline urgency: 0 (far future) → 10 (today / overdue)
  IF p_due_date IS NULL THEN
    v_deadline_urgency := 5.0;
  ELSIF p_due_date < CURRENT_DATE THEN
    v_deadline_urgency := 10.0;
  ELSE
    v_days_until := (p_due_date - CURRENT_DATE);
    v_deadline_urgency := GREATEST(0.0, 10.0 - (v_days_until::NUMERIC / 3.0));
  END IF;

  -- Impact points (maps 1-3 to 0-10 scale)
  v_impact_points := CASE p_impact
    WHEN 'needle_mover' THEN 10.0
    WHEN 'important'    THEN 6.7
    WHEN 'nice'         THEN 3.3
    ELSE                     3.3  -- null treated as nice
  END;

  -- Size multiplier (quick = priority boost, big = slight penalty)
  v_size_multiplier := CASE p_size
    WHEN 'quick' THEN 1.2
    WHEN 'big'   THEN 0.9
    ELSE              1.0
  END;

  -- Weighted base: deadline 40%, impact 35%, size via multiplier (25% implied)
  v_base_score := (v_deadline_urgency * 4.0 + v_impact_points * 3.5) * v_size_multiplier;

  -- Overdue + not done → float to top
  IF p_due_date IS NOT NULL AND p_due_date < CURRENT_DATE
     AND p_status IS DISTINCT FROM 'done' AND p_status IS DISTINCT FROM 'archived' THEN
    v_base_score := v_base_score + 1000.0;
  END IF;

  RETURN ROUND(v_base_score, 2);
END;
$$ LANGUAGE plpgsql;


-- Recompute trigger: fires on UPDATE of relevant fields
CREATE OR REPLACE FUNCTION trigger_recompute_priority_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := compute_priority_score(NEW.due_date, NEW.impact, NEW.size, NEW.status::TEXT);
  -- Auto-reset manually_positioned when deadline changes or status changes
  IF (OLD.due_date IS DISTINCT FROM NEW.due_date) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.manually_positioned := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_priority_score_trigger ON tasks;

CREATE TRIGGER tasks_priority_score_trigger
  BEFORE UPDATE OF due_date, impact, size, status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_priority_score();


-- Bulk recompute function for daily cron
CREATE OR REPLACE FUNCTION recompute_all_priority_scores()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE tasks
  SET priority_score = compute_priority_score(due_date, impact, size, status::TEXT)
  WHERE archived_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;
