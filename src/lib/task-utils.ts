import type { Task, TaskStatus } from "./types/tasks";

/**
 * Format a sub-task title with project context.
 * Output: "פרויקט (Project Name) חלק (1/4) - Sub-task title"
 */
export function formatProjectTaskTitle(
  projectTitle: string,
  partNumber: number,
  totalParts: number,
  subtaskTitle: string
): string {
  return `פרויקט (${projectTitle}) חלק (${partNumber}/${totalParts}) - ${subtaskTitle}`;
}

/**
 * Build a description showing all sibling tasks in a project.
 */
export function buildProjectDescription(
  siblings: { title: string; status: TaskStatus }[]
): string {
  return siblings
    .map((s, i) => {
      const statusIcon = s.status === "done" ? "✅" : s.status === "in_progress" ? "🔄" : "⬜";
      return `${statusIcon} ${i + 1}. ${s.title}`;
    })
    .join("\n");
}

/**
 * Check if a task should be flagged for breakdown into sub-tasks.
 * Tasks estimated at 120+ minutes should be split.
 */
export function shouldFlagForBreakdown(estimatedMinutes: number | null | undefined): boolean {
  return estimatedMinutes != null && estimatedMinutes >= 120;
}

/**
 * Get project progress: how many sub-tasks are done out of total.
 */
export function getProjectProgress(subtasks: Pick<Task, "status">[]): {
  done: number;
  total: number;
  percent: number;
} {
  const done = subtasks.filter((t) => t.status === "done").length;
  const total = subtasks.length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}
