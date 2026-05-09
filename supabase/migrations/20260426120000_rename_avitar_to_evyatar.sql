-- Rename 'avitar' -> 'evyatar' in both enums
-- RENAME VALUE updates catalog label; existing rows reflect new name automatically
ALTER TYPE partner RENAME VALUE 'avitar' TO 'evyatar';
ALTER TYPE task_owner RENAME VALUE 'avitar' TO 'evyatar';
