-- המאמן bot — Avitar's personal trainer data
-- Created: 2026-04-11

CREATE TABLE IF NOT EXISTS avitar_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  meal_slot INTEGER CHECK (meal_slot BETWEEN 1 AND 5),
  meal_name TEXT NOT NULL,
  protein_g NUMERIC(6,1) DEFAULT 0,
  carbs_g NUMERIC(6,1) DEFAULT 0,
  fat_g NUMERIC(6,1) DEFAULT 0,
  kcal INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avitar_workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('A', 'B', 'cardio', 'walk', 'other')),
  exercise TEXT,
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC(5,2),
  steps INTEGER,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avitar_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  weight_kg NUMERIC(5,2),
  steps INTEGER,
  kcal_total INTEGER,
  protein_total NUMERIC(6,1),
  workouts_this_week INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date queries
CREATE INDEX IF NOT EXISTS idx_avitar_nutrition_date ON avitar_nutrition_logs(date);
CREATE INDEX IF NOT EXISTS idx_avitar_workout_date ON avitar_workout_logs(date);
