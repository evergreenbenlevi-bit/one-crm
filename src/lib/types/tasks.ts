export type TaskPriority = "p1" | "p2" | "p3";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting_ben" | "done" | "inbox" | "up_next" | "scheduled" | "waiting" | "someday" | "archived";
export type TaskOwner = "claude" | "ben" | "both" | "avitar";
export type TaskCategory = "one_tm" | "self" | "brand" | "temp" | "research" | "infrastructure" | "personal" | "errands";
export type TaskLayer = "needle_mover" | "project" | "quick_win" | "wishlist" | "nice_to_have";
export type TaskEffort = "quick" | "small" | "medium" | "large";
export type TaskImpact = "needle_mover" | "important" | "nice";
export type TaskSize = "quick" | "medium" | "big";

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
  // Triage layer (deprecated — use effort instead)
  layer?: TaskLayer | null;
  // Effort estimate (deprecated — use size)
  effort?: TaskEffort | null;
  // Impact (new triage axis)
  impact?: TaskImpact | null;
  // Size (new triage axis)
  size?: TaskSize | null;
  // Archive
  archived_at?: string | null;
  archive_reason?: string | null;
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
  inbox: "תיבת כניסה",
  up_next: "הבא בתור",
  scheduled: "מתוזמן",
  waiting: "ממתין",
  someday: "יום מן הימים",
  archived: "בארכיון",
};

export const statusColors: Record<TaskStatus, string> = {
  backlog: "bg-gray-50 dark:bg-gray-800/80",
  todo: "bg-blue-50/60 dark:bg-blue-900/10",
  in_progress: "bg-amber-50/60 dark:bg-amber-900/10",
  waiting_ben: "bg-purple-50/60 dark:bg-purple-900/10",
  done: "bg-green-50/60 dark:bg-green-900/10",
  inbox: "bg-slate-50 dark:bg-slate-800/80",
  up_next: "bg-cyan-50/60 dark:bg-cyan-900/10",
  scheduled: "bg-indigo-50/60 dark:bg-indigo-900/10",
  waiting: "bg-purple-50/60 dark:bg-purple-900/10",
  someday: "bg-stone-50/60 dark:bg-stone-900/10",
  archived: "bg-neutral-50/60 dark:bg-neutral-900/10",
};

export const statusAccent: Record<TaskStatus, string> = {
  backlog: "bg-gray-300 dark:bg-gray-600",
  todo: "bg-blue-400",
  in_progress: "bg-amber-400",
  waiting_ben: "bg-purple-400",
  done: "bg-green-400",
  inbox: "bg-slate-400",
  up_next: "bg-cyan-400",
  scheduled: "bg-indigo-400",
  waiting: "bg-purple-300",
  someday: "bg-stone-400",
  archived: "bg-neutral-400",
};

export const priorityLabels: Record<TaskPriority, string> = {
  p1: "P1 — קריטי",
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
  self: "מי אני במדיה",
  brand: "פרופיל עסקי",
  temp: "זמני",
  research: "מחקר / חד-פעמי",
  infrastructure: "תשתית",
  personal: "אישי",
  errands: "סידורים",
};

export const categoryColors: Record<TaskCategory, string> = {
  one_tm: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  self: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  brand: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  temp: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  research: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  infrastructure: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  personal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  errands: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

export const TASK_STATUSES: TaskStatus[] = ["inbox", "up_next", "scheduled", "in_progress", "waiting", "waiting_ben", "done", "someday", "archived", "backlog", "todo"];

export const impactLabels: Record<TaskImpact, string> = {
  needle_mover: "🔴 קריטי",
  important: "🟡 חשוב",
  nice: "⚪ נחמד",
};

export const impactColors: Record<TaskImpact, string> = {
  needle_mover: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  important: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  nice: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export const IMPACT_OPTIONS: TaskImpact[] = ["needle_mover", "important", "nice"];

export const sizeLabels: Record<TaskSize, string> = {
  quick: "⚡ מהיר (דקות)",
  medium: "📋 בינוני (שעות)",
  big: "🏗️ גדול (ימים+)",
};

export const sizeColors: Record<TaskSize, string> = {
  quick: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  big: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export const SIZE_OPTIONS: TaskSize[] = ["quick", "medium", "big"];

export const effortLabels: Record<TaskEffort, string> = {
  quick: "⚡ מהיר (5 דק׳)",
  small: "🕐 קטן (עד שעה)",
  medium: "📋 בינוני (עד יום)",
  large: "🏗️ פרויקט (כמה ימים+)",
};

export const effortColors: Record<TaskEffort, string> = {
  quick: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  small: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  large: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export const EFFORT_OPTIONS: TaskEffort[] = ["quick", "small", "medium", "large"];

// Categories visible in CRM UI
export const CRM_CATEGORIES: TaskCategory[] = ["one_tm", "brand", "research", "self", "errands", "infrastructure", "personal"];

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
