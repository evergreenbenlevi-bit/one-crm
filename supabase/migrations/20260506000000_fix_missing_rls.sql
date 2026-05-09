-- Fix: Enable RLS on all tables missing it
-- Root cause: migrations added without following initial schema pattern
-- Tables: 19 tables across fitness, medical, agent, content domains
-- Created: 2026-05-06

-- ─── HELPER: create policy only if not exists ───────────────────────────────
CREATE OR REPLACE FUNCTION _tmp_add_policy(tbl text, pol text) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = pol
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (auth.role() IN (''authenticated'', ''service_role''))',
      pol, tbl
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── FITNESS ────────────────────────────────────────────────────────────────
ALTER TABLE exercises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_daily   ENABLE ROW LEVEL SECURITY;

SELECT _tmp_add_policy('exercises',       'Authenticated full access');
SELECT _tmp_add_policy('workouts',        'Authenticated full access');
SELECT _tmp_add_policy('sets',            'Authenticated full access');
SELECT _tmp_add_policy('body_metrics',    'Authenticated full access');
SELECT _tmp_add_policy('nutrition_daily', 'Authenticated full access');

-- ─── MEDICAL (highest sensitivity) ──────────────────────────────────────────
ALTER TABLE blood_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_test_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_log            ENABLE ROW LEVEL SECURITY;

SELECT _tmp_add_policy('blood_tests',          'Authenticated full access');
SELECT _tmp_add_policy('blood_test_results',   'Authenticated full access');
SELECT _tmp_add_policy('medical_appointments', 'Authenticated full access');
SELECT _tmp_add_policy('medication_log',       'Authenticated full access');
SELECT _tmp_add_policy('symptom_log',          'Authenticated full access');

-- ─── AGENT COMMAND CENTER ────────────────────────────────────────────────────
ALTER TABLE agent_registry      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cost_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_edges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_chat_sessions ENABLE ROW LEVEL SECURITY;

SELECT _tmp_add_policy('agent_registry',      'Authenticated full access');
SELECT _tmp_add_policy('agent_health_events', 'Authenticated full access');
SELECT _tmp_add_policy('agent_cost_logs',     'Authenticated full access');
SELECT _tmp_add_policy('agent_edges',         'Authenticated full access');
SELECT _tmp_add_policy('agent_chat_sessions', 'Authenticated full access');

-- ─── AVITAR COACH ────────────────────────────────────────────────────────────
ALTER TABLE avitar_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE avitar_workout_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE avitar_progress       ENABLE ROW LEVEL SECURITY;

SELECT _tmp_add_policy('avitar_nutrition_logs', 'Authenticated full access');
SELECT _tmp_add_policy('avitar_workout_logs',   'Authenticated full access');
SELECT _tmp_add_policy('avitar_progress',       'Authenticated full access');

-- ─── CALENDAR / COURSE / CONTENT ─────────────────────────────────────────────
ALTER TABLE calendar_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;

SELECT _tmp_add_policy('calendar_queue', 'Authenticated full access');
SELECT _tmp_add_policy('course_levels',  'Authenticated full access');
SELECT _tmp_add_policy('course_modules', 'Authenticated full access');
SELECT _tmp_add_policy('areas',          'Authenticated full access');
SELECT _tmp_add_policy('folders',        'Authenticated full access');
SELECT _tmp_add_policy('content_pieces', 'Authenticated full access');

-- ─── CLEANUP HELPER ──────────────────────────────────────────────────────────
DROP FUNCTION _tmp_add_policy(text, text);
