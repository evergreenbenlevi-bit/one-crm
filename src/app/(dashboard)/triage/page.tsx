"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskLayer, TaskCategory } from "@/lib/types/tasks";
import { Zap, Clock, FolderKanban, Trash2, MessageSquare, Check, Search, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

// ─── Layer config ────────────────────────────────────────────────────────────
const LAYERS: { id: TaskLayer; label: string; emoji: string; color: string; bg: string; border: string; desc: string }[] = [
  {
    id: "quick_win",
    label: "Quick Win",
    emoji: "⚡",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-700",
    desc: "עד 5 דקות · נשלח ב-20:00",
  },
  {
    id: "project",
    label: "פרויקט",
    emoji: "🎯",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-700",
    desc: "חשוב · session ייעודי",
  },
  {
    id: "low_priority",
    label: "נמוך",
    emoji: "📋",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/60",
    border: "border-gray-200 dark:border-gray-700",
    desc: "סיקור בשבת",
  },
  {
    id: "deleted",
    label: "מחק",
    emoji: "🗑️",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-200 dark:border-red-700",
    desc: "הסר מהרשימה",
  },
];

const LAYER_MAP = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

const CATEGORY_LABELS: Record<string, string> = {
  one_tm: "ONE™",
  infrastructure: "תשתית",
  self: "אישי-עצמי",
  personal: "אישי",
  brand: "מותג",
  research: "מחקר",
  temp: "זמני",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function TriagePage() {
  const { data: tasks, mutate } = useSWR<Task[]>("/api/tasks?limit=500", fetcher);
  const [localLayers, setLocalLayers] = useState<Record<string, TaskLayer>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [brainDump, setBrainDump] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsePreview, setParsePreview] = useState<{ id: string; title: string; layer: TaskLayer }[] | null>(null);

  // Merge server layers with local overrides
  const getLayer = useCallback(
    (task: Task): TaskLayer => localLayers[task.id] ?? task.layer ?? "low_priority",
    [localLayers]
  );

  // Filter and group
  const filtered = useMemo(() => {
    if (!tasks) return {};
    const q = search.toLowerCase();
    const result: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (q && !task.title.toLowerCase().includes(q)) continue;
      const cat = task.category ?? "other";
      if (!result[cat]) result[cat] = [];
      result[cat].push(task);
    }
    // Sort categories by size
    return Object.fromEntries(
      Object.entries(result).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [tasks, search]);

  const pendingCount = Object.keys(localLayers).length;

  // Save all changes
  const save = useCallback(async () => {
    if (!pendingCount) return;
    setSaving(true);
    const updates = Object.entries(localLayers).map(([id, layer]) => ({ id, layer }));
    await fetch("/api/triage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSaving(false);
    setSaved(true);
    setLocalLayers({});
    mutate();
    setTimeout(() => setSaved(false), 2000);
  }, [localLayers, pendingCount, mutate]);

  // Brain dump parse
  const parseDump = useCallback(async () => {
    if (!brainDump.trim() || !tasks) return;
    setParsing(true);
    const res = await fetch("/api/triage/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: brainDump,
        tasks: tasks.map((t) => ({ id: t.id, title: t.title })),
      }),
    });
    const data = await res.json();
    setParsePreview(data.updates ?? []);
    setParsing(false);
  }, [brainDump, tasks]);

  // Apply brain dump preview
  const applyPreview = useCallback(() => {
    if (!parsePreview) return;
    const newLayers: Record<string, TaskLayer> = { ...localLayers };
    for (const u of parsePreview) newLayers[u.id] = u.layer;
    setLocalLayers(newLayers);
    setParsePreview(null);
    setBrainDump("");
  }, [parsePreview, localLayers]);

  const stats = useMemo(() => {
    if (!tasks) return null;
    const counts: Record<TaskLayer, number> = { quick_win: 0, low_priority: 0, project: 0, deleted: 0 };
    for (const t of tasks) {
      const l = getLayer(t);
      counts[l] = (counts[l] ?? 0) + 1;
    }
    return counts;
  }, [tasks, getLayer]);

  if (!tasks) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Triage — סיווג משימות</h1>
          <p className="text-sm text-gray-500 mt-1">בחר שכבה לכל משימה. שמירה אוטומטית.</p>
        </div>
        <button
          onClick={save}
          disabled={!pendingCount || saving}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            pendingCount > 0
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800"
          )}
        >
          {saved ? (
            <><Check size={15} /> נשמר</>
          ) : saving ? (
            "שומר..."
          ) : (
            <>{pendingCount > 0 && <span className="bg-white/20 rounded px-1">{pendingCount}</span>} שמור שינויים</>
          )}
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {LAYERS.map((l) => (
            <div key={l.id} className={clsx("rounded-xl border p-3 text-center", l.bg, l.border)}>
              <div className="text-2xl font-bold">{stats[l.id]}</div>
              <div className={clsx("text-xs font-medium mt-0.5", l.color)}>{l.emoji} {l.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Brain dump */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
          <MessageSquare size={16} />
          Brain Dump — כתוב בחופשיות
        </div>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder={'דוגמה: "AGI QA זה פרויקט, ביטול gamma זה quick win, כל מה שקשור ל-ManyChat תמחק..."'}
          className="w-full h-24 p-3 rounded-lg border border-purple-200 dark:border-purple-600 bg-white dark:bg-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={parseDump}
            disabled={!brainDump.trim() || parsing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {parsing ? "מנתח..." : "נתח עם AI"}
          </button>
          {brainDump && <button onClick={() => setBrainDump("")} className="text-sm text-gray-400 hover:text-gray-600">נקה</button>}
        </div>

        {/* Preview */}
        {parsePreview && parsePreview.length > 0 && (
          <div className="rounded-lg border border-purple-300 bg-white dark:bg-gray-900 dark:border-purple-600 p-3 space-y-2">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
              AI מצא {parsePreview.length} שינויים — לאשר?
            </div>
            {parsePreview.map((u) => {
              const lCfg = LAYER_MAP[u.layer];
              return (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-xs">{u.title}</span>
                  <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", lCfg?.bg, lCfg?.color)}>
                    {lCfg?.emoji} {lCfg?.label}
                  </span>
                </div>
              );
            })}
            <div className="flex gap-2 pt-1">
              <button onClick={applyPreview} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <Check size={13} className="inline ml-1" />אשר הכל
              </button>
              <button onClick={() => setParsePreview(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm">
                בטל
              </button>
            </div>
          </div>
        )}
        {parsePreview && parsePreview.length === 0 && (
          <p className="text-sm text-gray-500">לא זוהו משימות ספציפיות בטקסט. נסה שוב עם שמות מדויקים יותר.</p>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש משימה..."
          className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Task groups */}
      <div className="space-y-4">
        {Object.entries(filtered).map(([cat, catTasks]) => {
          const isCollapsed = collapsed[cat];
          const catLabel = CATEGORY_LABELS[cat] ?? cat;
          return (
            <div key={cat} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{catLabel}</span>
                  <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{catTasks.length}</span>
                </div>
                {/* Mini layer breakdown per category */}
                <div className="flex gap-1.5">
                  {LAYERS.filter((l) => l.id !== "deleted").map((l) => {
                    const count = catTasks.filter((t) => getLayer(t) === l.id).length;
                    if (!count) return null;
                    return (
                      <span key={l.id} className={clsx("text-xs px-1.5 py-0.5 rounded-full font-medium", l.bg, l.color)}>
                        {l.emoji}{count}
                      </span>
                    );
                  })}
                </div>
              </button>

              {/* Task rows */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {catTasks.map((task) => {
                    const currentLayer = getLayer(task);
                    const isDirty = localLayers[task.id] !== undefined;
                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors",
                          isDirty && "bg-blue-50/40 dark:bg-blue-900/10"
                        )}
                      >
                        {/* Priority dot */}
                        <div
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            task.priority === "p1" ? "bg-red-400" : task.priority === "p2" ? "bg-yellow-400" : "bg-gray-300"
                          )}
                        />

                        {/* Title */}
                        <span
                          className={clsx(
                            "flex-1 text-sm truncate",
                            currentLayer === "deleted"
                              ? "line-through text-gray-400"
                              : "text-gray-800 dark:text-gray-200"
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </span>

                        {/* Owner + due */}
                        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                          <span>{task.owner === "claude" ? "🤖" : task.owner === "ben" ? "🙋" : "👥"}</span>
                          {task.due_date && (
                            <span className={clsx(task.due_date < "2026-04-01" && "text-red-400")}>
                              {task.due_date}
                            </span>
                          )}
                        </div>

                        {/* Layer buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          {LAYERS.map((l) => (
                            <button
                              key={l.id}
                              title={l.label}
                              onClick={() =>
                                setLocalLayers((prev) =>
                                  currentLayer === l.id && !isDirty
                                    ? prev
                                    : { ...prev, [task.id]: l.id }
                                )
                              }
                              className={clsx(
                                "w-7 h-7 rounded-lg text-sm transition-all border",
                                currentLayer === l.id
                                  ? clsx(l.bg, l.border, "shadow-sm scale-110")
                                  : "border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                              )}
                            >
                              {l.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating save bar */}
      {pendingCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl">
          <span className="text-sm">{pendingCount} שינויים ממתינים</span>
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors"
          >
            {saving ? "שומר..." : "שמור הכל"}
          </button>
          <button
            onClick={() => setLocalLayers({})}
            className="text-gray-400 hover:text-gray-200 text-sm"
          >
            בטל
          </button>
        </div>
      )}
    </div>
  );
}
