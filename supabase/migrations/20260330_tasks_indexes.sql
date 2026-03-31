-- Tasks Table Performance Indexes
-- Added: 2026-03-30
-- Purpose: Speed up common query patterns (status filter, owner filter, category filter, position sort)

-- Active tasks filter (most common: exclude backlog + done)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- Owner-based queue filtering
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks (owner);

-- Category-based filtering (pillars view)
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);

-- Priority sorting within status groups
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);

-- Position ordering (kanban drag order)
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks (position);

-- Composite: most common API query pattern (status + owner)
CREATE INDEX IF NOT EXISTS idx_tasks_status_owner ON tasks (status, owner);

-- Composite: category + status for pillars view
CREATE INDEX IF NOT EXISTS idx_tasks_category_status ON tasks (category, status);
