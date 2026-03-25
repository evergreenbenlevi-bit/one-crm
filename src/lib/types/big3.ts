export type Big3ProjectType = "needle_mover" | "build" | "maintenance";

export interface Big3Project {
  id: string;
  user_id: string | null;
  week_start: string; // YYYY-MM-DD (Monday)
  name: string;
  description: string | null;
  why_now: string | null;
  success_definition: string | null;
  type: Big3ProjectType;
  position: number; // 1, 2, 3
  created_at: string;
  tasks?: Big3Task[];
}

export interface Big3Task {
  id: string;
  project_id: string;
  title: string;
  estimated_minutes: number | null;
  scheduled_date: string | null; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null;
  position: number;
  created_at: string;
}

export const projectTypeEmoji: Record<Big3ProjectType, string> = {
  needle_mover: "🔴",
  build: "🟡",
  maintenance: "🟢",
};

export const projectTypeLabel: Record<Big3ProjectType, string> = {
  needle_mover: "Needle-Mover",
  build: "בנייה",
  maintenance: "תחזוקה",
};
