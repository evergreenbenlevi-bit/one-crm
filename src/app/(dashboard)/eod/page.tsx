"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { clsx } from "clsx";
import { CheckCircle2, AlertTriangle, Clock, Dumbbell, Send, ChevronDown, ChevronRight } from "lucide-react";

interface EODTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  time_slot: string | null;
  impact: string | null;
  completed_at: string | null;
}

interface EODSummary {
  date: string;
  open_tasks: EODTask[];
  overdue_tasks: EODTask[];
  completed_today: EODTask[];
  time_logged: number;
  stats: { open_count: number; overdue_count: number; completed_count: number };
}

type TaskAction = "done" | "carry" | "park" | "kill";

const ACTION_LABELS: Record<TaskAction, string> = {
  done: "סיימתי",
  carry: "ממשיך מחר",
  park: "פארק",
  kill: "מחיקה",
};

const ACTION_COLORS: Record<TaskAction, string> = {
  done: "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200",
  carry: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
  park: "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
  kill: "border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950",
};

const DURATION_OPTIONS = [5, 15, 30, 45, 60, 90, 120, 180];

export default function EodPage() {
  const { data, isLoading, error } = useSWR<EODSummary>("/api/eod/summary", fetcher, {
    revalidateOnFocus: false,
  });

  const [taskActions, setTaskActions] = useState<Record<string, TaskAction>>({});
  const [taskMinutes, setTaskMinutes] = useState<Record<string, number>>({});
  const [fitness, setFitness] = useState({
    steps: "",
    workout: "",
    nutrition: "",
    energy_score: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [overdueExpanded, setOverdueExpanded] = useState(true);

  function setAction(id: string, action: TaskAction) {
    setTaskActions((prev) => ({ ...prev, [id]: action }));
  }

  function setMinutes(id: string, mins: number) {
    setTaskMinutes((prev) => ({ ...prev, [id]: mins }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);

    const allTasks = [...(data?.open_tasks ?? []), ...(data?.completed_today ?? [])];

    const task_logs = allTasks
      .filter((t) => taskActions[t.id] || taskMinutes[t.id])
      .map((t) => ({
        id: t.id,
        action: taskActions[t.id] ?? undefined,
        actual_minutes: taskMinutes[t.id] ?? undefined,
      }));

    const fitnessPayload = {
      steps: fitness.steps ? parseInt(fitness.steps) : null,
      workout: fitness.workout || null,
      nutrition: fitness.nutrition || null,
      energy_score: fitness.energy_score ? parseInt(fitness.energy_score) : null,
    };

    await fetch("/api/eod/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_logs, fitness: fitnessPayload }),
    });

    setSubmitting(false);
    setSubmitted(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600 text-sm">
        טוען נתוני יום...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        שגיאה בטעינת סיכום יום
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 mx-auto text-gray-900 dark:text-white" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">יום סגור.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">נתוני כושר נשלחו למייק. משימות עודכנו.</p>
      </div>
    );
  }

  const allActionsTaken = (data.open_tasks ?? []).every((t) => taskActions[t.id]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">סיכום יום</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date(data.date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          {" · "}
          {data.stats.completed_count} הושלמו
          {data.time_logged > 0 && ` · ${data.time_logged} דק׳ רשומות`}
        </p>
      </div>

      {/* Overdue */}
      {data.overdue_tasks.length > 0 && (
        <section>
          <button
            onClick={() => setOverdueExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 mb-3 w-full text-right"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            פג תוקף ({data.overdue_tasks.length})
            {overdueExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {overdueExpanded && (
            <div className="space-y-2">
              {data.overdue_tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  action={taskActions[task.id]}
                  minutes={taskMinutes[task.id]}
                  onAction={setAction}
                  onMinutes={setMinutes}
                  overdue
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Open today */}
      {data.open_tasks.length > 0 && (
        <section>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            פתוחות היום ({data.open_tasks.length})
          </p>
          <div className="space-y-2">
            {data.open_tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                action={taskActions[task.id]}
                minutes={taskMinutes[task.id]}
                onAction={setAction}
                onMinutes={setMinutes}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed today — log actual minutes */}
      {data.completed_today.length > 0 && (
        <section>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <CheckCircle2 className="w-4 h-4 inline mr-1 text-gray-400" />
            הושלמו היום ({data.completed_today.length})
          </p>
          <div className="space-y-2">
            {data.completed_today.map((task) => (
              <CompletedRow
                key={task.id}
                task={task}
                minutes={taskMinutes[task.id] ?? task.actual_minutes ?? undefined}
                onMinutes={setMinutes}
              />
            ))}
          </div>
        </section>
      )}

      {/* Fitness */}
      <section className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          נתוני גוף — מייק
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">צעדים</label>
            <input
              type="number"
              placeholder="8000"
              value={fitness.steps}
              onChange={(e) => setFitness((f) => ({ ...f, steps: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">אנרגיה (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              placeholder="7"
              value={fitness.energy_score}
              onChange={(e) => setFitness((f) => ({ ...f, energy_score: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">אימון</label>
            <input
              type="text"
              placeholder="חזה + כתפיים"
              value={fitness.workout}
              onChange={(e) => setFitness((f) => ({ ...f, workout: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">תזונה</label>
            <input
              type="text"
              placeholder="3 ארוחות, 170g חלבון"
              value={fitness.nutrition}
              onChange={(e) => setFitness((f) => ({ ...f, nutrition: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        </div>
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={clsx(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors",
          "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
          submitting && "opacity-50 cursor-not-allowed"
        )}
      >
        <Send className="w-4 h-4" />
        {submitting ? "שולח..." : "סגור יום"}
      </button>

      {!allActionsTaken && data.open_tasks.length > 0 && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-600 -mt-4">
          {data.open_tasks.filter((t) => !taskActions[t.id]).length} משימות ללא פעולה — ימשיכו כ"ממשיך מחר"
        </p>
      )}
    </div>
  );
}

function TaskRow({
  task,
  action,
  minutes,
  onAction,
  onMinutes,
  overdue,
}: {
  task: EODTask;
  action?: TaskAction;
  minutes?: number;
  onAction: (id: string, a: TaskAction) => void;
  onMinutes: (id: string, m: number) => void;
  overdue?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-3 space-y-2",
        overdue
          ? "border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900",
        action === "done" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-gray-900 dark:text-white leading-snug">{task.title}</span>
        {task.estimated_minutes && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimated_minutes}׳
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["done", "carry", "park", "kill"] as TaskAction[]).map((a) => (
          <button
            key={a}
            onClick={() => onAction(task.id, a)}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-md transition-colors",
              action === a
                ? ACTION_COLORS[a]
                : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {ACTION_LABELS[a]}
          </button>
        ))}
        {action === "done" && (
          <select
            value={minutes ?? ""}
            onChange={(e) => onMinutes(task.id, parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">זמן בפועל</option>
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>{m} דק׳</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function CompletedRow({
  task,
  minutes,
  onMinutes,
}: {
  task: EODTask;
  minutes?: number;
  onMinutes: (id: string, m: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-center justify-between gap-3 opacity-75">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-600" />
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{task.title}</span>
      </div>
      <select
        value={minutes ?? ""}
        onChange={(e) => onMinutes(task.id, parseInt(e.target.value))}
        className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shrink-0"
      >
        <option value="">{task.estimated_minutes ? `${task.estimated_minutes}׳ (הערכה)` : "זמן בפועל"}</option>
        {DURATION_OPTIONS.map((m) => (
          <option key={m} value={m}>{m} דק׳</option>
        ))}
      </select>
    </div>
  );
}
