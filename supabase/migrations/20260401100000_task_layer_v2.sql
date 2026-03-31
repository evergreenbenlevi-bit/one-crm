-- Expand layer to 6 values: needle_mover, project, quick_win, wishlist, nice_to_have, deleted
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_layer_check;
-- First remap old values before adding new constraint
UPDATE tasks SET layer = 'nice_to_have' WHERE layer = 'low_priority';
ALTER TABLE tasks ADD CONSTRAINT tasks_layer_check
  CHECK (layer IN ('needle_mover', 'project', 'quick_win', 'wishlist', 'nice_to_have', 'deleted'));

-- Reset all layers so we can re-classify with better rules
UPDATE tasks SET layer = NULL;

-- 1. NEEDLE MOVERS — revenue/growth/product
UPDATE tasks SET layer = 'needle_mover' WHERE layer IS NULL AND (
  lower(title) LIKE '%one™%' OR lower(title) LIKE '%launch%' OR
  lower(title) LIKE '%docengine%' OR lower(title) LIKE '%scale20%' OR
  lower(title) LIKE '%quarantine%' OR lower(title) LIKE '%transcri%' OR
  lower(title) LIKE '%vsl%' OR lower(title) LIKE '%playbook%' OR
  lower(title) LIKE '%content system%' OR lower(title) LIKE '%content factory%' OR
  lower(title) LIKE '%niche%' OR lower(title) LIKE '%positioning%' OR
  lower(title) LIKE '%deep model%' OR lower(title) LIKE '%media identity%' OR
  lower(title) LIKE '%deep profile%' OR lower(title) LIKE '%brand voice%' OR
  lower(title) LIKE '%offer%' OR lower(title) LIKE '%קורס%'
);

-- 2. PROJECTS — important infrastructure/AI/agents
UPDATE tasks SET layer = 'project' WHERE layer IS NULL AND (
  lower(title) LIKE '%pipeline%' OR lower(title) LIKE '%agent%' OR
  lower(title) LIKE '%agi%' OR lower(title) LIKE '%aitan%' OR
  lower(title) LIKE '%oracle%' OR lower(title) LIKE '%cassandra%' OR
  lower(title) LIKE '%miro%' OR lower(title) LIKE '%whoop%' OR
  lower(title) LIKE '%rize%' OR lower(title) LIKE '%fitness%' OR
  lower(title) LIKE '%crm%' OR lower(title) LIKE '%dashboard%' OR
  lower(title) LIKE '%design language%' OR lower(title) LIKE '%system%' OR
  lower(title) LIKE '%sergegatari%' OR lower(title) LIKE '%carl%' OR
  lower(title) LIKE '%manychat%' OR lower(title) LIKE '%automation%' OR
  lower(title) LIKE '%integration%' OR lower(title) LIKE '%audit%' OR
  lower(title) LIKE '%cron%' OR lower(title) LIKE '%skill%'
);

-- 3. QUICK WINS — 5 min actions
UPDATE tasks SET layer = 'quick_win' WHERE layer IS NULL AND (
  lower(title) LIKE '%ביטול%' OR lower(title) LIKE '%cancel%' OR
  lower(title) LIKE '%gamma%' OR lower(title) LIKE '%sql%' OR
  lower(title) LIKE '%oauth%' OR lower(title) LIKE '%אישור%' OR
  lower(title) LIKE '%webhook%' OR lower(title) LIKE '%plist%' OR
  lower(title) LIKE '%npm install%' OR lower(title) LIKE '%pip install%' OR
  lower(title) LIKE '%לבטל%' OR lower(title) LIKE '%לשלם%' OR
  lower(title) LIKE '%fillout%' OR lower(title) LIKE '%cardcom%' OR
  lower(title) LIKE '%glasses%' OR lower(title) LIKE '%משקפיים%' OR
  lower(title) LIKE '%הודעה ל%' OR lower(title) LIKE '%לשלוח%' OR
  lower(title) LIKE '%downgrade%' OR lower(title) LIKE '%confirm%'
);

-- 4. WISHLIST — shopping/buying
UPDATE tasks SET layer = 'wishlist' WHERE layer IS NULL AND (
  lower(title) LIKE '%אבקת חלבון%' OR lower(title) LIKE '%סיאליס%' OR
  lower(title) LIKE '%כובע%' OR lower(title) LIKE '%לוונדר%' OR
  lower(title) LIKE '%ויישליסט%' OR lower(title) LIKE '%לקנות%' OR
  lower(title) LIKE '%ריח%' OR lower(title) LIKE '%canva%'
);

-- 5. DELETED — temp category
UPDATE tasks SET layer = 'deleted' WHERE layer IS NULL AND category = 'temp';

-- 6. Remaining → nice_to_have (safe default, Ben can reassign)
UPDATE tasks SET layer = 'nice_to_have' WHERE layer IS NULL;
