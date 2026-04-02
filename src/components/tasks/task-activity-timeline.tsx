"use client";

import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
import { fetcher } from "@/lib/fetcher";
import { clsx } from "clsx";
import { MessageSquare, ArrowRight, CheckCircle2, Archive, Clock, Send } from "lucide-react";

interface ActivityEntry {
  id: string;
  task_id: string;
  activity_type: "note" | "status_change" | "field_change" | "created" | "completed" | "archived";
  actor: "ben" | "claude" | "system";
  content: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTOR_ICONS: Record<string, string> = { ben: "🙋", claude: "🤖", system: "⚙️" };
const ACTOR_LABELS: Record<string, string> = { ben: "בן", claude: "Claude", system: "מערכת" };

const TYPE_CONFIG: Record<string, { color: string; dotColor: string; icon: typeof MessageSquare; label: string }> = {
  note:          { color: "text-blue-600 dark:text-blue-400",   dotColor: "bg-blue-500",   icon: MessageSquare, label: "הערה" },
  status_change: { color: "text-amber-600 dark:text-amber-400", dotColor: "bg-amber-500",  icon: ArrowRight,    label: "שינוי סטטוס" },
  field_change:  { color: "text-gray-500 dark:text-gray-400",   dotColor: "bg-gray-400",   icon: ArrowRight,    label: "עדכון" },
  created:       { color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500",  icon: Clock,         label: "נוצר" },
  completed:     { color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500",  icon: CheckCircle2,  label: "הושלם" },
  archived:      { color: "text-red-500 dark:text-red-400",     dotColor: "bg-red-500",    icon: Archive,       label: "ארכיון" },
};

const FIELD_LABELS: Record<string, string> = {
  status: "סטטוס", priority: "עדיפות", category: "קטגוריה",
  layer: "שכבה", owner: "אחראי", due_date: "דדליין", title: "כותרת",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  if (diffHour < 24) return `לפני ${diffHour} שע׳`;
  if (diffDay < 7) return `לפני ${diffDay} ימים`;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: diffDay > 365 ? "numeric" : undefined });
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const cfg = TYPE_CONFIG[entry.activity_type] || TYPE_CONFIG.field_change;
  const Icon = cfg.icon;

  let description = "";
  if (entry.activity_type === "note") {
    description = entry.content || "";
  } else if (entry.activity_type === "completed") {
    description = entry.content || "הושלם";
  } else if (entry.activity_type === "archived") {
    description = entry.content ? `סיבה: ${entry.content}` : "הועבר לארכיון";
  } else if (entry.activity_type === "status_change" || entry.activity_type === "field_change") {
    const fieldLabel = FIELD_LABELS[entry.field_name || ""] || entry.field_name || "";
    description = `${fieldLabel}: ${entry.old_value || "—"} → ${entry.new_value || "—"}`;
  } else if (entry.activity_type === "created") {
    description = "המשימה נוצרה";
  }

  return (
    <div className="flex gap-3 relative">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <div className={clsx("w-2.5 h-2.5 rounded-full", cfg.dotColor)} />
        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{ACTOR_ICONS[entry.actor]}</span>
          <span className={clsx("text-[11px] font-medium", cfg.color)}>{cfg.label}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-auto">{formatDate(entry.created_at)}</span>
        </div>
        {entry.activity_type === "note" ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{description}</p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );
}

export function TaskActivityTimeline({ taskId }: { taskId: string }) {
  const { data: activities, isLoading, mutate } = useSWR<ActivityEntry[]>(
    taskId ? `/api/tasks/${taskId}/activity` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [noteText]);

  async function handleAddNote() {
    if (!noteText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim(), actor: "ben" }),
      });
      if (res.ok) {
        setNoteText("");
        mutate();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add note form */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
            placeholder="הוסף הערה..."
            rows={1}
            className={clsx(
              "flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600",
              "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200",
              "focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none",
              "placeholder-gray-400"
            )}
          />
          <button
            onClick={handleAddNote}
            disabled={!noteText.trim() || sending}
            className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors flex-shrink-0 self-end"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">אין פעילות עדיין</p>
            <p className="text-[10px] mt-0.5 opacity-70">הוסף הערה או שנה סטטוס כדי להתחיל</p>
          </div>
        ) : (
          <div>
            {activities.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
