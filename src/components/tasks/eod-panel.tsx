"use client";

import { useState, useEffect } from "react";
import { X, Check, SkipForward, Archive, Trash2, Moon } from "lucide-react";
import { clsx } from "clsx";

interface EODTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  priority_score: number | null;
  time_slot: string | null;
}

interface EODSummary {
  open_tasks: EODTask[];
  overdue_tasks: EODTask[];
  completed_today: EODTask[];
  time_logged: number;
}

type TaskAction = "done" | "carry" | "park" | "kill";

interface TaskLog {
  id: string;
  actual_minutes?: number | null;
  action?: TaskAction;
}

interface FitnessData {
  steps: string;
  workout: string;
  nutrition: string;
  energy_score: string;
}

interface EODPanelProps {
  onDismiss: () => void;
  onSubmitted: () => void;
}

const ACTION_CONFIG: Record<TaskAction, { label: string; icon: React.ElementType; color: string }> = {
  done:  { label: "סיום",    icon: Check,        color: "text-emerald-400 hover:bg-emerald-900/30 border-emerald-800" },
  carry: { label: "מחר",    icon: SkipForward,   color: "text-blue-400 hover:bg-blue-900/30 border-blue-800" },
  park:  { label: "פארק",   icon: Archive,       color: "text-gray-400 hover:bg-gray-800 border-gray-700" },
  kill:  { label: "מחק",    icon: Trash2,        color: "text-red-400 hover:bg-red-900/30 border-red-800" },
};

export function EODPanel({ onDismiss, onSubmitted }: EODPanelProps) {
  const [summary, setSummary] = useState<EODSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [taskLogs, setTaskLogs] = useState<Map<string, TaskLog>>(new Map());
  const [fitness, setFitness] = useState<FitnessData>({ steps: "", workout: "", nutrition: "", energy_score: "" });

  useEffect(() => {
    fetch("/api/eod/summary")
      .then(r => r.json())
      .then((data: EODSummary) => {
        setSummary(data);
        // Pre-fill actual_minutes from existing data
        const initial = new Map<string, TaskLog>();
        [...(data.open_tasks ?? []), ...(data.overdue_tasks ?? [])].forEach(t => {
          initial.set(t.id, { id: t.id, actual_minutes: t.actual_minutes, action: undefined });
        });
        setTaskLogs(initial);
      })
      .catch(() => setSummary({ open_tasks: [], overdue_tasks: [], completed_today: [], time_logged: 0 }))
      .finally(() => setLoading(false));
  }, []);

  function setAction(taskId: string, action: TaskAction) {
    setTaskLogs(prev => {
      const next = new Map(prev);
      const existing = next.get(taskId) ?? { id: taskId };
      next.set(taskId, { ...existing, action: existing.action === action ? undefined : action });
      return next;
    });
  }

  function setMinutes(taskId: string, val: string) {
    setTaskLogs(prev => {
      const next = new Map(prev);
      const existing = next.get(taskId) ?? { id: taskId };
      next.set(taskId, { ...existing, actual_minutes: val === "" ? null : Number(val) });
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    const logs = Array.from(taskLogs.values()).filter(l => l.action || l.actual_minutes != null);
    const fitnessPayload = {
      steps: fitness.steps ? Number(fitness.steps) : null,
      workout: fitness.workout || null,
      nutrition: fitness.nutrition || null,
      energy_score: fitness.energy_score ? Number(fitness.energy_score) : null,
    };
    try {
      await fetch("/api/eod/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_logs: logs, fitness: fitnessPayload }),
      });
      setSubmitted(true);
      setTimeout(() => onSubmitted(), 1500);
    } catch {
      setSubmitting(false);
    }
  }

  const allTasks = summary ? [...(summary.overdue_tasks ?? []), ...(summary.open_tasks ?? [])] : [];
  const actionedCount = Array.from(taskLogs.values()).filter(l => l.action).length;
  const canSubmit = actionedCount > 0 && !submitting;

  const fieldClass = "w-full text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 placeholder-gray-600 focus:ring-1 focus:ring-gray-500 outline-none";

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-5 py-4 flex items-center gap-3">
        <Check size={18} className="text-emerald-400 flex-shrink-0" />
        <span className="text-sm text-emerald-300 font-medium">EOD נשלח ✓</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Moon size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-200">סיכום יום</span>
          {summary && (
            <span className="text-xs text-gray-500">
              {allTasks.length} פתוחות · {summary.completed_today.length} הושלמו · {summary.time_logged} דק׳
            </span>
          )}
        </div>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-gray-800 transition-colors">
          <X size={14} className="text-gray-500" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Tasks */}
        {loading ? (
          <div className="text-xs text-gray-500 py-2">טוען...</div>
        ) : allTasks.length === 0 ? (
          <div className="text-xs text-gray-500 py-2">אין משימות פתוחות להיום 🎉</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">משימות פתוחות</p>
            {allTasks.map(task => {
              const log = taskLogs.get(task.id);
              const isOverdue = summary?.overdue_tasks.some(t => t.id === task.id);
              return (
                <div key={task.id} className={clsx(
                  "rounded-lg border p-3 space-y-2",
                  log?.action ? "border-gray-700 bg-gray-800/50" : "border-gray-800 bg-gray-950/50"
                )}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={clsx("text-sm text-gray-200 truncate", log?.action === "kill" && "line-through text-gray-500")}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOverdue && <span className="text-[10px] text-red-400 font-medium">פג תוקף</span>}
                        {task.due_date && <span className="text-[10px] text-gray-600">{task.due_date}</span>}
                        {task.estimated_minutes && <span className="text-[10px] text-gray-600">{task.estimated_minutes} דק׳ מוערך</span>}
                      </div>
                    </div>
                    {/* actual minutes */}
                    <input
                      type="number"
                      min={0}
                      max={480}
                      placeholder="דק׳"
                      value={log?.actual_minutes ?? ""}
                      onChange={e => setMinutes(task.id, e.target.value)}
                      className="w-16 text-xs px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300 placeholder-gray-600 text-center outline-none focus:border-gray-500"
                    />
                  </div>
                  {/* action buttons */}
                  <div className="flex gap-1.5">
                    {(["done", "carry", "park", "kill"] as TaskAction[]).map(action => {
                      const cfg = ACTION_CONFIG[action];
                      const Icon = cfg.icon;
                      const isActive = log?.action === action;
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => setAction(task.id, action)}
                          className={clsx(
                            "flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors",
                            cfg.color,
                            isActive ? "opacity-100 font-semibold bg-opacity-20" : "opacity-50"
                          )}
                        >
                          <Icon size={11} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fitness stub */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">כושר — Mike</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="צעדים" value={fitness.steps} onChange={e => setFitness(p => ({ ...p, steps: e.target.value }))} className={fieldClass} />
            <select value={fitness.energy_score} onChange={e => setFitness(p => ({ ...p, energy_score: e.target.value }))} className={clsx(fieldClass, "text-gray-400")}>
              <option value="">אנרגיה 1-10</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="text" placeholder="אימון (מה עשית)" value={fitness.workout} onChange={e => setFitness(p => ({ ...p, workout: e.target.value }))} className={fieldClass} />
            <input type="text" placeholder="תזונה (תיאור קצר)" value={fitness.nutrition} onChange={e => setFitness(p => ({ ...p, nutrition: e.target.value }))} className={fieldClass} />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={clsx(
            "w-full py-2.5 rounded-lg text-sm font-semibold transition-colors",
            canSubmit
              ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          )}
        >
          {submitting ? "שולח..." : `שלח EOD${actionedCount > 0 ? ` (${actionedCount} משימות)` : ""}`}
        </button>
      </div>
    </div>
  );
}
