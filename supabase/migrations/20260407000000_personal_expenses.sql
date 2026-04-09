-- Personal Expense Support
-- Adds expense_type (business/personal) and personal expense categories

-- 1. Create expense_type enum
DO $$ BEGIN
  CREATE TYPE expense_type AS ENUM ('business', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add expense_type column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type expense_type DEFAULT 'business';

-- 3. Add personal expense categories
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'haircut';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'fuel';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'car_wash';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'groceries';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'personal_other';

-- 4. Index for filtering by expense type
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_type_date ON expenses(expense_type, date);

-- 5. Constraint: personal expenses must be paid_by=ben with split_ratio=0
-- (enforced at API level, but add a check for safety)
ALTER TABLE expenses ADD CONSTRAINT chk_personal_expense_owner
  CHECK (expense_type = 'business' OR (paid_by = 'ben' AND split_ratio = 0));
