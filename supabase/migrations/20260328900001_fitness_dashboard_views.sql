-- Migration 003: Views for fitness dashboard
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/acqqkgzxkxocftkbyvur/sql/new

-- daily_macros: aggregated nutrition per day (used by Overview + Nutrition pages)
CREATE OR REPLACE VIEW daily_macros AS
SELECT
  date,
  ROUND(SUM(protein_g)::numeric, 1)  AS protein_g,
  ROUND(SUM(carbs_g)::numeric, 1)    AS carbs_g,
  ROUND(SUM(fat_g)::numeric, 1)      AS fat_g,
  SUM(kcal)                          AS kcal,
  COUNT(*)                           AS meals_logged
FROM nutrition_logs
GROUP BY date
ORDER BY date;

-- weekly_volume: total volume (kg × sets) per muscle group per week (used by Workout page)
-- Requires exercise_sets joined to workout_sessions → exercises
DROP VIEW IF EXISTS weekly_volume CASCADE;
CREATE OR REPLACE VIEW weekly_volume AS
SELECT
  date_trunc('week', ws.date)::date  AS week_start,
  e.muscle_group,
  SUM(es.weight_kg * es.reps)        AS total_volume_kg
FROM exercise_sets es
JOIN workout_sessions ws ON ws.id = es.session_id
JOIN exercises e ON e.id = es.exercise_id
WHERE es.weight_kg IS NOT NULL AND es.reps IS NOT NULL
GROUP BY date_trunc('week', ws.date), e.muscle_group
ORDER BY week_start, muscle_group;

-- exercise_prs: best set (heaviest weight) per exercise, with date and reps (used by Workout page)
DROP VIEW IF EXISTS exercise_prs CASCADE;
CREATE OR REPLACE VIEW exercise_prs AS
SELECT DISTINCT ON (e.id)
  e.id,
  e.name,
  e.muscle_group,
  es.weight_kg  AS pr_weight_kg,
  es.reps,
  ws.date       AS pr_date
FROM exercise_sets es
JOIN workout_sessions ws ON ws.id = es.session_id
JOIN exercises e ON e.id = es.exercise_id
WHERE es.weight_kg IS NOT NULL
ORDER BY e.id, es.weight_kg DESC, ws.date DESC;
