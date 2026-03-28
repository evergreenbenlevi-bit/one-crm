export type TaskPriority = "p1" | "p2" | "p3";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting_ben" | "done";
export type TaskOwner = "claude" | "ben" | "both" | "avitar";
export type TaskCategory = "one_tm" | "self" | "brand" | "temp" | "research";

export type RecurPattern = "daily" | `weekly:${number}` | `monthly:${number}`;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  owner: TaskOwner;
  category: TaskCategory;
  due_date: string | null;
  tags: string[];
  depends_on: string | null;
  parent_id: string | null;
  source: string | null;
  source_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Workstream (sub-categorization within pillar)
  workstream?: string | null;
  // Sprint week (BIG3 cycle, format: "2026-W13")
  sprint_week?: string | null;
  // Recurring
  is_recurring?: boolean;
  recur_pattern?: string | null;
  recur_next_at?: string | null;
}

export const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "לעשות",
  in_progress: "בביצוע",
  waiting_ben: "ממתין לבן",
  done: "הושלם",
};

export const statusColors: Record<TaskStatus, string> = {
  backlog: "bg-gray-50 dark:bg-gray-800/80",
  todo: "bg-blue-50/60 dark:bg-blue-900/10",
  in_progress: "bg-amber-50/60 dark:bg-amber-900/10",
  waiting_ben: "bg-purple-50/60 dark:bg-purple-900/10",
  done: "bg-green-50/60 dark:bg-green-900/10",
};

export const statusAccent: Record<TaskStatus, string> = {
  backlog: "bg-gray-300 dark:bg-gray-600",
  todo: "bg-blue-400",
  in_progress: "bg-amber-400",
  waiting_ben: "bg-purple-400",
  done: "bg-green-400",
};

export const priorityLabels: Record<TaskPriority, string> = {
  p1: "P1 — מזיז מחט",
  p2: "P2 — חשוב",
  p3: "P3 — Nice to have",
};

export const priorityColors: Record<TaskPriority, string> = {
  p1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  p2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  p3: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export const ownerLabels: Record<TaskOwner, string> = {
  claude: "Claude",
  ben: "בן",
  both: "Claude + בן",
  avitar: "אביתר",
};

export const ownerIcons: Record<TaskOwner, string> = {
  claude: "🤖",
  ben: "🙋",
  both: "🤝",
  avitar: "👤",
};

export const categoryLabels: Record<TaskCategory, string> = {
  one_tm: "ONE™",
  self: "מציאת העצמי",
  brand: "פרופיל עסקי",
  temp: "זמני",
  research: "מחקר / חד-פעמי",
};

export const categoryColors: Record<TaskCategory, string> = {
  one_tm: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  self: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  brand: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  temp: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  research: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

export const TASK_STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "waiting_ben", "done"];

export const SUGGESTED_TAGS = [
  // פילרים
  "#workbook", "#media-identity", "#human-design",
  "#niche", "#content-system", "#avatar", "#video", "#miro",
  "#docengine", "#crm", "#launch", "#manychat", "#copywriter",
  // זמניים
  "#lori-5years", "#contract-v3",
  // סטטוס
  "#blocked", "#quick-win", "#sprint", "#waiting-api", "#review", "#urgent",
];
