-- Migrate existing data to new pillar categories
UPDATE tasks SET category = 'self'  WHERE category = 'infrastructure';
UPDATE tasks SET category = 'self'  WHERE category = 'personal';
UPDATE tasks SET category = 'brand' WHERE category = 'content';
