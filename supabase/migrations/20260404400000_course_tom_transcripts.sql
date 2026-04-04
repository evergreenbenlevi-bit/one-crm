-- Add Tom's original transcript data to course modules
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS tom_transcript TEXT;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS tom_file_paths TEXT[];
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS tom_notes TEXT;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS decision_reason TEXT;
