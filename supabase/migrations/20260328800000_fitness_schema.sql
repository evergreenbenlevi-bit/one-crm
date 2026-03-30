-- Fitness AI System — Schema
-- PHASE 2 — Supabase tables for fitness-coach agent
-- Same instance as ONE-CRM (acqqkgzxkxocftkbyvur)
-- Created: 2026-03-28

-- ============================================================
-- 1. EXERCISES — catalog of all exercises
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  muscle_group text NOT NULL,       -- chest | back | legs | shoulders | arms | core | cardio
  equipment   text NOT NULL,        -- barbell | dumbbell | cable | machine | bodyweight | smith
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_idx ON exercises (lower(name));

-- ============================================================
-- 2. WORKOUTS — each training session
-- ============================================================
CREATE TABLE IF NOT EXISTS workouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  day_type    text NOT NULL,        -- chest | back | legs | shoulders | arms | run | rest
  duration_min int,                 -- total minutes
  notes       text,
  feeling     int CHECK (feeling BETWEEN 1 AND 5),  -- 1=terrible 5=amazing
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workouts_date_idx ON workouts (date DESC);

-- ============================================================
-- 3. SETS — individual sets within a workout
-- ============================================================
CREATE TABLE IF NOT EXISTS sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number  int NOT NULL,
  weight_kg   numeric(5,2),         -- null = bodyweight
  reps        int NOT NULL,
  rpe         int CHECK (rpe BETWEEN 1 AND 10),  -- Rate of Perceived Exertion
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sets_workout_idx ON sets (workout_id);
CREATE INDEX IF NOT EXISTS sets_exercise_idx ON sets (exercise_id);

-- ============================================================
-- 4. BODY_METRICS — weight, body fat, measurements
-- ============================================================
CREATE TABLE IF NOT EXISTS body_metrics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL UNIQUE,
  weight_kg   numeric(4,1),
  body_fat_pct numeric(4,1),
  chest_cm    numeric(4,1),
  waist_cm    numeric(4,1),
  hips_cm     numeric(4,1),
  arm_cm      numeric(4,1),
  thigh_cm    numeric(4,1),
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS body_metrics_date_idx ON body_metrics (date DESC);

-- ============================================================
-- 5. NUTRITION_DAILY — daily macro totals
-- ============================================================
CREATE TABLE IF NOT EXISTS nutrition_daily (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL UNIQUE,
  protein_g   numeric(5,1),
  carbs_g     numeric(5,1),
  fat_g       numeric(5,1),
  calories    int,
  water_ml    int,
  notes       text,
  -- meal breakdown (optional JSON array)
  meals       jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nutrition_date_idx ON nutrition_daily (date DESC);

-- ============================================================
-- 6. PROGRESSIVE OVERLOAD VIEW
-- last set per exercise + recommended next weight
-- ============================================================
CREATE OR REPLACE VIEW exercise_progress AS
SELECT
  e.name AS exercise,
  e.muscle_group,
  w.date,
  w.day_type,
  s.weight_kg,
  s.reps,
  s.set_number,
  -- recommend next weight based on progressive overload rule
  CASE
    WHEN e.equipment IN ('barbell', 'smith') THEN s.weight_kg + 2.5
    WHEN e.equipment IN ('dumbbell') THEN s.weight_kg + 2.0
    WHEN e.equipment IN ('cable', 'machine') THEN s.weight_kg + 2.5
    ELSE s.weight_kg
  END AS next_weight_recommendation
FROM sets s
JOIN exercises e ON e.id = s.exercise_id
JOIN workouts w ON w.id = s.workout_id
WHERE (s.exercise_id, w.date) IN (
  SELECT s2.exercise_id, MAX(w2.date)
  FROM sets s2
  JOIN workouts w2 ON w2.id = s2.workout_id
  GROUP BY s2.exercise_id
)
ORDER BY e.muscle_group, e.name;

-- ============================================================
-- 7. SEED — exercises from workout-plan-active.md
-- ============================================================

-- CHEST (Push A)
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Bench Press', 'chest', 'barbell'),
  ('Incline Bench Press', 'chest', 'smith'),
  ('Incline Bench Press DB', 'chest', 'dumbbell'),
  ('Cable Crossover', 'chest', 'cable'),
  ('Chest Dip', 'chest', 'bodyweight'),
  ('Chest Fly', 'chest', 'dumbbell')
ON CONFLICT DO NOTHING;

-- SHOULDERS
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Lateral Raise', 'shoulders', 'dumbbell'),
  ('Lateral Raise Cable', 'shoulders', 'cable'),
  ('Face Pull', 'shoulders', 'cable')
ON CONFLICT DO NOTHING;

-- TRICEPS
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Triceps Extension', 'arms', 'dumbbell'),
  ('Triceps Pushdown', 'arms', 'cable')
ON CONFLICT DO NOTHING;

-- BACK (Pull A)
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Lat Pulldown', 'back', 'cable'),
  ('Seated Row', 'back', 'cable'),
  ('Pullover', 'back', 'dumbbell'),
  ('Iso-Lateral Row', 'back', 'machine'),
  ('Pendlay Row', 'back', 'barbell'),
  ('Bent Over Row', 'back', 'barbell')
ON CONFLICT DO NOTHING;

-- BICEPS
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Bicep Curl', 'arms', 'dumbbell'),
  ('Bicep Curl Barbell', 'arms', 'barbell'),
  ('Bicep Curl Machine', 'arms', 'machine'),
  ('Incline Curl', 'arms', 'dumbbell')
ON CONFLICT DO NOTHING;

-- LEGS
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Leg Press', 'legs', 'machine'),
  ('Leg Extension', 'legs', 'machine'),
  ('Seated Leg Curl', 'legs', 'machine'),
  ('Lying Leg Curl', 'legs', 'machine'),
  ('Standing Calf Raise', 'legs', 'machine'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Squat', 'legs', 'barbell')
ON CONFLICT DO NOTHING;

-- CORE
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Cable Crunch', 'core', 'cable'),
  ('Hanging Knee Raise', 'core', 'bodyweight'),
  ('Russian Twist', 'core', 'bodyweight'),
  ('Crunch Stability Ball', 'core', 'bodyweight'),
  ('Knee Raise Captain Chair', 'core', 'bodyweight')
ON CONFLICT DO NOTHING;

-- CARDIO
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Running', 'cardio', 'bodyweight')
ON CONFLICT DO NOTHING;
