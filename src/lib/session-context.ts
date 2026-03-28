/**
 * Session Context — localStorage-based session restore
 * Powers "continue where you left off" widget in Focus view.
 * Zero DB reads, instant load.
 */

const KEY = "crm_session_ctx";

export interface SessionContext {
  taskId: string;
  taskTitle: string;
  pillar: string;
  savedAt: string; // ISO timestamp
}

export function saveSessionContext(task: { id: string; title: string; category: string }): void {
  if (typeof window === "undefined") return;
  const ctx: SessionContext = {
    taskId: task.id,
    taskTitle: task.title,
    pillar: task.category,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    // localStorage might be unavailable in some contexts
  }
}

export function loadSessionContext(): SessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as SessionContext;
    // Discard if older than 7 days
    const age = Date.now() - new Date(ctx.savedAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return ctx;
  } catch {
    return null;
  }
}

export function clearSessionContext(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Returns human-readable time since last session */
export function sessionAgeLabel(savedAt: string): string {
  const diffMs = Date.now() - new Date(savedAt).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "לפני פחות משעה";
  if (diffH < 24) return `לפני ${diffH} שעות`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "אתמול";
  return `לפני ${diffD} ימים`;
}
