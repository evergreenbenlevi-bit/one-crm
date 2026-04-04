-- Add course_editor role for partner access (Avitar)
-- course_editor can ONLY access /course-builder — nothing else

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'course_editor';
