-- Add 'layer' column for task triage system (3-tier: quick_win, low_priority, project)
-- Also add 'deleted' for soft-delete via triage
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS layer text
  CHECK (layer IN ('quick_win', 'low_priority', 'project', 'deleted'));

-- Index for fast filtering by layer
CREATE INDEX IF NOT EXISTS tasks_layer_idx ON tasks (layer);

-- Auto-classify existing tasks based on rules agreed with Ben:
-- 1. temp category → deleted
UPDATE tasks SET layer = 'deleted' WHERE category = 'temp' AND layer IS NULL;

-- 2. Quick win keywords → quick_win
UPDATE tasks SET layer = 'quick_win'
WHERE layer IS NULL AND (
  lower(title) LIKE '%ביטול%' OR lower(title) LIKE '%cancel%' OR
  lower(title) LIKE '%gamma%' OR lower(title) LIKE '%sql%' OR
  lower(title) LIKE '%oauth%' OR lower(title) LIKE '%אישור%' OR
  lower(title) LIKE '%משקפיים%' OR lower(title) LIKE '%glasses%' OR
  lower(title) LIKE '%plist%' OR lower(title) LIKE '%launchctl%' OR
  lower(title) LIKE '%webhook%' OR lower(title) LIKE '%npm install%' OR
  lower(title) LIKE '%ביטול%' OR lower(title) LIKE '%לבטל%' OR
  lower(title) LIKE '%לשלם%' OR lower(title) LIKE '%fillout%' OR
  lower(title) LIKE '%cardcom%' OR lower(title) LIKE '%pip install%' OR
  lower(title) LIKE '%brew install%'
);

-- 3. Project keywords → project
UPDATE tasks SET layer = 'project'
WHERE layer IS NULL AND (
  lower(title) LIKE '%pipeline%' OR lower(title) LIKE '%launch%' OR
  lower(title) LIKE '%docengine%' OR lower(title) LIKE '%oracle%' OR
  lower(title) LIKE '%miro%' OR lower(title) LIKE '%deep profile%' OR
  lower(title) LIKE '%media identity%' OR lower(title) LIKE '%whoop%' OR
  lower(title) LIKE '%rize%' OR lower(title) LIKE '%sergegatari%' OR
  lower(title) LIKE '%playbook%' OR lower(title) LIKE '%fitness%' OR
  lower(title) LIKE '%content factory%' OR lower(title) LIKE '%brand%' OR
  lower(title) LIKE '%positioning%' OR lower(title) LIKE '%scale20%' OR
  lower(title) LIKE '%quarantine%' OR lower(title) LIKE '%transcri%' OR
  lower(title) LIKE '%one design%' OR lower(title) LIKE '%vsl%' OR
  lower(title) LIKE '%niche%' OR lower(title) LIKE '%agi%' OR
  lower(title) LIKE '%aitan%'
);

-- 4. claude + no due_date + p2/p3 → low_priority
UPDATE tasks SET layer = 'low_priority'
WHERE layer IS NULL
  AND owner = 'claude'
  AND due_date IS NULL
  AND priority IN ('p2', 'p3');

-- 5. personal + no due_date + p3 → low_priority
UPDATE tasks SET layer = 'low_priority'
WHERE layer IS NULL
  AND category = 'personal'
  AND due_date IS NULL
  AND priority = 'p3';

-- 6. infrastructure + claude + p1 → project
UPDATE tasks SET layer = 'project'
WHERE layer IS NULL
  AND category = 'infrastructure'
  AND owner = 'claude'
  AND priority = 'p1';

-- Remaining unclassified → low_priority as safe default (Ben can change in triage UI)
UPDATE tasks SET layer = 'low_priority'
WHERE layer IS NULL;
