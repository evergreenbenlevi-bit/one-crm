-- DOC Agent medical tables
-- Created: 2026-04-05

CREATE TABLE IF NOT EXISTS blood_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date DATE NOT NULL,
  lab_name TEXT DEFAULT 'לאומית',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_date)
);

CREATE TABLE IF NOT EXISTS blood_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_test_id UUID REFERENCES blood_tests(id) ON DELETE CASCADE,
  marker_name TEXT NOT NULL,
  marker_category TEXT,
  value NUMERIC,
  unit TEXT,
  lab_ref_low NUMERIC,
  lab_ref_high NUMERIC,
  optimal_low NUMERIC,
  optimal_high NUMERIC,
  flag TEXT CHECK (flag IN ('normal', 'suboptimal', 'high', 'low', 'critical')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_date TIMESTAMPTZ NOT NULL,
  doctor_name TEXT,
  specialty TEXT,
  location TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  prep_notes TEXT,
  post_notes TEXT,
  follow_up TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  started_date DATE,
  ended_date DATE,
  prescriber TEXT,
  reason TEXT,
  side_effects TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS symptom_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT now(),
  symptom TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  duration TEXT,
  context TEXT,
  related_markers TEXT[],
  action_taken TEXT,
  resolved BOOLEAN DEFAULT false
);
