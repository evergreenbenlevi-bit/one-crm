/**
 * ONE-CRM API Reference
 * Auto-loaded by Claude and internal tools. TypeScript-checked — stays in sync with routes.
 * Base URL: https://one-crm-nine.vercel.app (prod) | http://localhost:3000 (dev)
 * Auth: Supabase session cookie (browser) or service_role key (server-to-server)
 */

// ──────────────────────────────────────────────
// TASKS
// ──────────────────────────────────────────────

/**
 * GET /api/tasks
 * Fetch tasks with optional filters.
 *
 * Query params:
 *   status          TaskStatus  "open" | "in_progress" | "waiting" | "done"
 *   priority        "p0" | "p1" | "p2" | "p3"
 *   owner           "ben" | "claude" | "both" | "evyatar"
 *   category        TaskCategory
 *   project_id      UUID
 *   domain          "business" | "personal"
 *   archived        "1"  — return tasks where archived_at IS NOT NULL
 *   exclude_backlog "1"  — exclude done + archived tasks (active task queue)
 *   limit           number (default 200)
 *   offset          number (default 0)
 *
 * Returns: Task[]
 */
export type GetTasksParams = {
  status?: "open" | "in_progress" | "waiting" | "done";
  priority?: "p0" | "p1" | "p2" | "p3";
  owner?: "ben" | "claude" | "both" | "evyatar";
  category?: string;
  project_id?: string;
  domain?: "business" | "personal";
  archived?: "1";
  exclude_backlog?: "1";
  limit?: number;
  offset?: number;
};

/**
 * POST /api/tasks
 * Create a new task.
 *
 * Body: Partial<Task> — required: title
 * Defaults: status="open", priority="p2", owner="ben", category="one_tm"
 *
 * Returns: Task (created row)
 */
export type CreateTaskBody = {
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "waiting" | "done";
  priority?: "p0" | "p1" | "p2" | "p3";
  owner?: "ben" | "claude" | "both" | "evyatar";
  category?: string;
  project_id?: string;
  due_date?: string; // ISO date string
  tags?: string[];
  estimated_minutes?: number;
  domain?: "business" | "personal";
};

/**
 * PATCH /api/tasks
 * Update a task by id.
 *
 * Body: { id: string } + any updatable fields
 * Returns: Task (updated row)
 */
export type UpdateTaskBody = {
  id: string;
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "waiting" | "done";
  priority?: "p0" | "p1" | "p2" | "p3";
  owner?: "ben" | "claude" | "both" | "evyatar";
  category?: string;
  project_id?: string | null;
  due_date?: string | null;
  tags?: string[];
  position?: number;
  estimated_minutes?: number | null;
  domain?: "business" | "personal" | null;
  manually_positioned?: boolean;
};

/**
 * PATCH /api/tasks — reorder (position update only)
 *
 * Body: { id: string; position: number; manually_positioned?: boolean }
 * Used by DnD to persist card order within a column.
 */
export type ReorderTaskBody = {
  id: string;
  position: number;
  manually_positioned?: boolean;
};

/**
 * DELETE /api/tasks?id=<UUID>
 * Hard-delete a task by id.
 * Returns: { success: true }
 */

// ──────────────────────────────────────────────
// TASKS — BULK
// ──────────────────────────────────────────────

/**
 * POST /api/tasks/bulk
 * Create multiple tasks at once.
 *
 * Body: { tasks: CreateTaskBody[] }
 * Returns: { created: Task[] }
 */

/**
 * PATCH /api/tasks/bulk-update
 * Update multiple tasks in one request.
 *
 * Body: { ids: string[]; updates: Partial<UpdateTaskBody> }
 * Returns: { updated: number }
 */

/**
 * DELETE /api/tasks/bulk-update
 * Delete multiple tasks.
 *
 * Body: { ids: string[] }
 * Returns: { deleted: number }
 */

// ──────────────────────────────────────────────
// TASKS — COMPLETE
// ──────────────────────────────────────────────

/**
 * POST /api/tasks/:id/complete
 * Mark a task as done and set completed_at.
 *
 * Returns: Task (updated row)
 */

// ──────────────────────────────────────────────
// PROJECTS
// ──────────────────────────────────────────────

/**
 * GET /api/projects
 * Fetch all projects.
 *
 * Query params:
 *   status    "active" | "paused" | "done" | "archived"
 *   portfolio "one" | "solo" | "harness" | "exploratory" | "clients"
 *
 * Returns: Project[]
 */

/**
 * POST /api/projects
 * Create a new project.
 *
 * Body: Partial<Project> — required: title
 * Returns: Project (created row)
 */
export type CreateProjectBody = {
  title: string;
  description?: string;
  status?: "active" | "paused" | "done" | "archived";
  priority?: "p1" | "p2" | "p3";
  category?: string;
  portfolio?: "one" | "solo" | "harness" | "exploratory" | "clients";
  owner?: "ben" | "claude" | "both" | "evyatar";
  deadline?: string; // ISO date
  tags?: string[];
};

/**
 * PATCH /api/projects
 * Update a project.
 *
 * Body: { id: string } + updatable fields
 * Returns: Project (updated row)
 */

/**
 * DELETE /api/projects?id=<UUID>
 * Archive or hard-delete a project.
 */

// ──────────────────────────────────────────────
// PROJECT NOTES
// ──────────────────────────────────────────────

/**
 * GET /api/projects/:id/notes
 * Fetch the project's note (one per project).
 *
 * Returns: { content: string; updated_at: string | null }
 */

/**
 * PATCH /api/projects/:id/notes
 * Upsert (create or update) the project note.
 *
 * Body: { content: string }
 * Returns: { content: string; updated_at: string }
 */

// ──────────────────────────────────────────────
// STATUS VALUES (canonical post-migration)
// ──────────────────────────────────────────────

export const API_TASK_STATUSES = ["open", "in_progress", "waiting", "done"] as const;
export type APITaskStatus = typeof API_TASK_STATUSES[number];

export const API_PROJECT_STATUSES = ["active", "paused", "done", "archived"] as const;
export type APIProjectStatus = typeof API_PROJECT_STATUSES[number];

export const API_PRIORITIES = ["p0", "p1", "p2", "p3"] as const;
export type APIPriority = typeof API_PRIORITIES[number];

export const API_OWNERS = ["ben", "claude", "both", "evyatar"] as const;
export type APIOwner = typeof API_OWNERS[number];
