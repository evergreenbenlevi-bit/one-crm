-- Add 'errands' category for personal admin tasks (errands, cancellations, payments, etc.)
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'errands';

-- Reclassify misplaced tasks from 'self'/'personal' to 'errands'
-- "self" should ONLY be used for "מי אני במדיה" (media identity) work
UPDATE tasks SET category = 'errands'
WHERE category IN ('self', 'personal')
AND (
  lower(title) LIKE '%ביטול%' OR lower(title) LIKE '%cancel%' OR
  lower(title) LIKE '%הודעה ל%' OR lower(title) LIKE '%לשלוח%' OR
  lower(title) LIKE '%משקפיים%' OR lower(title) LIKE '%glasses%' OR
  lower(title) LIKE '%תשלום%' OR lower(title) LIKE '%לשלם%' OR
  lower(title) LIKE '%דירה%' OR lower(title) LIKE '%שכירות%' OR
  lower(title) LIKE '%אחזור%' OR lower(title) LIKE '%תיקון%' OR
  lower(title) LIKE '%לבטל%' OR lower(title) LIKE '%להחזיר%' OR
  lower(title) LIKE '%downgrade%' OR lower(title) LIKE '%gamma%' OR
  lower(title) LIKE '%calendly%' OR lower(title) LIKE '%loom%' OR
  lower(title) LIKE '%מנוי%'
);
