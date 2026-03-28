-- Task System Redesign: Add workstream + sprint_week columns
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add workstream column (sub-categorization within pillar)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS workstream text DEFAULT NULL;

-- 2. Add sprint_week column (BIG3 cycle linking)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_week text DEFAULT NULL;

-- 3. Composite index for fast pillar/status/priority queries
CREATE INDEX IF NOT EXISTS tasks_category_status_priority
  ON tasks (category, status, priority);

-- 4. Fix misplaced infrastructure tasks: self → one_tm
UPDATE tasks SET category = 'one_tm'
WHERE category = 'self'
AND (
  title ILIKE '%docengine%' OR
  title ILIKE '%doc engine%' OR
  title ILIKE '%crm%' OR
  title ILIKE '%cron%' OR
  title ILIKE '%webhook%' OR
  title ILIKE '%agent%' OR
  title ILIKE '%mcp%' OR
  title ILIKE '%supabase%' OR
  title ILIKE '%vercel%' OR
  title ILIKE '%api%' OR
  title ILIKE '%automation%' OR
  title ILIKE '%pipeline%' OR
  title ILIKE '%infrastructure%' OR
  title ILIKE '%skill%' OR
  title ILIKE '%telegram%' OR
  title ILIKE '%n8n%' OR
  title ILIKE '%deploy%' OR
  title ILIKE '%migration%'
);

-- 5. Auto-populate workstream from title keywords
UPDATE tasks SET workstream = CASE
  WHEN title ILIKE '%docengine%' OR title ILIKE '%doc engine%'  THEN 'docengine'
  WHEN title ILIKE '%one-crm%' OR (title ILIKE '%crm%' AND category = 'one_tm') THEN 'crm'
  WHEN title ILIKE '%avatar%' OR title ILIKE '%lora%' OR title ILIKE '%loRA%'   THEN 'avatar'
  WHEN title ILIKE '%video%' OR title ILIKE '%reel%' OR title ILIKE '%remotion%' THEN 'video-pipeline'
  WHEN title ILIKE '%miro%'                                                       THEN 'miro'
  WHEN title ILIKE '%copywriter%' OR title ILIKE '%copy%'                        THEN 'copywriter'
  WHEN title ILIKE '%launch%'                                                     THEN 'launch'
  WHEN title ILIKE '%manychat%'                                                   THEN 'manychat'
  WHEN title ILIKE '%workbook%' OR title ILIKE '%deep profile%'                  THEN 'workbook'
  WHEN title ILIKE '%media identity%' OR title ILIKE '%מי אני%'                  THEN 'media-identity'
  WHEN title ILIKE '%human design%' OR title ILIKE '%human-design%'              THEN 'human-design'
  WHEN title ILIKE '%niche%'                                                      THEN 'niche'
  WHEN title ILIKE '%content system%' OR title ILIKE '%content os%'              THEN 'content-system'
  WHEN title ILIKE '%cron%' OR title ILIKE '%schedule%'                          THEN 'infrastructure'
  WHEN title ILIKE '%oracle%'                                                     THEN 'oracle'
  ELSE NULL
END
WHERE workstream IS NULL;

-- 6. Tag all active (non-backlog) tasks to current sprint week
UPDATE tasks SET sprint_week = '2026-W13'
WHERE status IN ('todo', 'in_progress', 'waiting_ben')
AND sprint_week IS NULL;
