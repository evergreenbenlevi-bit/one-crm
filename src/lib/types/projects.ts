export type ProjectStatus = "active" | "paused" | "done" | "archived";
export type ProjectPriority = "p1" | "p2" | "p3";
export type ProjectPortfolio = "one" | "solo" | "harness" | "exploratory" | "clients";
export type ProjectOwner = "ben" | "claude" | "both" | "evyatar";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string | null;
  portfolio: ProjectPortfolio | null;
  owner: ProjectOwner;
  position: number;
  deadline: string | null;
  tags: string[];
  estimated_minutes: number | null;
  actual_minutes?: number | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Project with its tasks included (from GET /api/projects/[id]) */
export interface ProjectWithTasks extends Project {
  tasks: import("./tasks").Task[];
}
