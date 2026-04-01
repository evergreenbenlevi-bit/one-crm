"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskLayer, TaskCategory } from "@/lib/types/tasks";
import { categoryLabels, categoryColors } from "@/lib/types/tasks";
import { Zap, Clock, FolderOpen, Trash2, Brain, Save, ChevronDown, ChevronUp, Rocket, ShoppingBag, Sparkles, SkipForward } from "lucide-react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

// ─── Layer config ────────────────────────────────────────────────────────────
const LAYERS: { id: TaskLayer; label: string; labelHe: string; color: string; icon: typeof Zap; bg: string; emoji: string }[] = [
  { id: "needle_mover",label: "Needle Mover", labelHe: "מזיז מחט",    color: "text-rose-700  dark:text-rose-300",   icon: Rocket,     bg: "bg-rose-50   dark:bg-rose-900/20   border-rose-200  dark:border-rose-800",  emoji: "🚀" },
  { id: "project",     label: "Project",      labelHe: "פרויקט",      color: "text-blue-700  dark:text-blue-300",   icon: FolderOpen, bg: "bg-blue-50   dark:bg-blue-900/20   border-blue-200  dark:border-blue-800",  emoji: "📁" },
  { id: "quick_win",   label: "Quick Win",    labelHe: "קוויק ווין",  color: "text-green-700 dark:text-green-300",  icon: Zap,        bg: "bg-green-50  dark:bg-green-900/20  border-green-200 dark:border-green-800", emoji: "⚡" },
  { id: "wishlist",    label: "Wishlist",     labelHe: "ווישליסט",    color: "text-amber-700 dark:text-amber-300",  icon: ShoppingBag,bg: "bg-amber-50  dark:bg-amber-900/20  border-amber-200 dark:border-amber-800", emoji: "🛍️" },
  { id: "nice_to_have",label: "Nice to Have", labelHe: "נחמד",        color: "text-violet-600 dark:text-violet-400",icon: Sparkles,   bg: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",emoji: "✨" },
  { id: "deleted",     label: "Delete",       labelHe: "מחק",         color: "text-red-600   dark:text-red-400",    icon: Trash2,     bg: "bg-red-50    dark:bg-red-900/20    border-red-200   dark:border-red-800",   emoji: "🗑️" },
];

const LAYER_MAP = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<TaskLayer, typeof LAYERS[0]>;

// ─── Mobile Card Swipe View ───────────────────────────────────────────────────
function MobileTriageView({ tasks, onSaveLayer }: {
  tasks: Task[];
  onSaveLayer: (id: string, layer: TaskLayer) => Promise<void>;
}) {
  // Tasks without a layer (unclassified) — show all if none unclassified
  const unclassified = tasks.filter((t) => !t.layer);
  const queue = unclassified.length > 0 ? unclassified : tasks;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const total = queue.length;
  const done = index;
  const current = queue[index];

  async function handleLayer(layer: TaskLayer) {
    if (!current || saving) return;
    setSaving(true);
    await onSaveLayer(current.id, layer);
    setSaving(false);
    setDirection(-1);
    setIndex((i) => i + 1);
  }

  function handleSkip() {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.id));
    setDirection(-1);
    setIndex((i) => i + 1);
  }

  if (!current || index >= total) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">סיימת!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} משימות סווגו
          {skipped.size > 0 && ` · ${skipped.size} דולגו`}
        </p>
        <button
          onClick={() => setIndex(0)}
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
        >
          התחל מחדש
        </button>
      </div>
    );
  }

  const catColor = categoryColors[current.category as TaskCategory] ?? "bg-gray-100 text-gray-600";
  const layerCfg = current.layer ? LAYER_MAP[current.layer] : null;

  const row1 = LAYERS.slice(0, 3);
  const row2 = LAYERS.slice(3);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] px-4 pt-4 pb-6">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>{done} מתוך {total} סווגו</span>
          {skipped.size > 0 && <span className="text-amber-500">{skipped.size} דלגת</span>}
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              {/* Title */}
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug text-right">
                {current.title}
              </p>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 justify-end">
                <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium", catColor)}>
                  {categoryLabels[current.category as TaskCategory] ?? current.category}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {current.owner === "ben" ? "🙋 בן" : current.owner === "claude" ? "🤖 Claude" : "👥 שניהם"}
                </span>
                <span className={clsx(
                  "text-xs px-2.5 py-1 rounded-full font-bold",
                  current.priority === "p1" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                  current.priority === "p2" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}>
                  {current.priority.toUpperCase()}
                </span>
                {layerCfg && (
                  <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium border", layerCfg.bg, layerCfg.color)}>
                    {layerCfg.emoji} {layerCfg.labelHe}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Layer buttons */}
      <div className="space-y-3 mt-4">
        {[row1, row2].map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-2">
            {row.map((l) => (
              <button
                key={l.id}
                onClick={() => handleLayer(l.id)}
                disabled={saving}
                className={clsx(
                  "flex flex-col items-center justify-center gap-1 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50",
                  l.bg, l.color
                )}
              >
                <span className="text-xl">{l.emoji}</span>
                <span className="text-[11px] font-bold leading-tight text-center">{l.labelHe}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <SkipForward className="w-4 h-4" />
          דלג
        </button>
      </div>
    </div>
  );
}

// ─── Brain dump panel ────────────────────────────────────────────────────────
function BrainDump({ tasks, onUpdates }: {
  tasks: Task[];
  onUpdates: (u: { id: string; layer: TaskLayer }[]) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ id: string; title: string; layer: TaskLayer }[]>([]);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/triage/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tasks: tasks.map((t) => ({ id: t.id, title: t.title })) }),
      });
      const data = await res.json();
      setPreview(data.updates ?? []);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    onUpdates(preview.map(({ id, layer }) => ({ id, layer })));
    setApplied(true);
    setPreview([]);
    setText("");
  };

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <span className="font-semibold text-violet-700 dark:text-violet-300 text-sm">Brain Dump</span>
        <span className="text-xs text-violet-500">— כתוב בחופשיות מה להזיז לאן, Claude יפרסר</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setApplied(false); }}
        rows={3}
        placeholder='דוגמה: "AGI System QA זה פרויקט, ביטול Gamma זה quick win, כל ה-personal ללא תאריך זה נמוך"'
        className="w-full rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={parse}
          disabled={loading || !text.trim()}
          className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {loading ? "מפרסר..." : "פרסר →"}
        </button>
        {applied && <span className="text-xs text-green-600 dark:text-green-400">✓ הוחל</span>}
      </div>
      {preview.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">
            תצוגה מקדימה ({preview.length} שינויים):
          </p>
          {preview.map((u) => {
            const layer = LAYER_MAP[u.layer];
            return (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                <span className={clsx("px-2 py-0.5 rounded-full font-medium border", layer?.bg, layer?.color)}>
                  {layer?.labelHe}
                </span>
                <span className="text-gray-700 dark:text-gray-300 truncate">{u.title}</span>
              </div>
            );
          })}
          <button
            onClick={apply}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
          >
            <Save className="w-3 h-3" /> החל {preview.length} שינויים
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single task row ──────────────────────────────────────────────────────────
function TaskRow({ task, pendingLayer, onLayerChange }: {
  task: Task;
  pendingLayer?: TaskLayer;
  onLayerChange: (id: string, layer: TaskLayer) => void;
}) {
  const currentLayer = pendingLayer ?? task.layer ?? "nice_to_have";
  const layerCfg = LAYER_MAP[currentLayer];
  const catColor = categoryColors[task.category as TaskCategory] ?? "bg-gray-100 text-gray-600";
  const changed = pendingLayer && pendingLayer !== task.layer;

  return (
    <div className={clsx(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
      changed
        ? "bg-yellow-50 dark:bg-yellow-900/10 ring-1 ring-yellow-300 dark:ring-yellow-700"
        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
    )}>
      <span className={clsx("shrink-0 text-xs px-1.5 py-0.5 rounded font-medium", catColor)}>
        {categoryLabels[task.category as TaskCategory] ?? task.category}
      </span>
      <span className="flex-1 text-gray-800 dark:text-gray-200 truncate" title={task.title}>
        {task.title}
      </span>
      <div className="shrink-0 flex items-center gap-1">
        <span className="text-xs text-gray-400">
          {task.owner === "ben" ? "🙋" : task.owner === "claude" ? "🤖" : "👥"}
        </span>
        <span className={clsx("text-xs font-mono",
          task.priority === "p1" ? "text-red-500" :
          task.priority === "p2" ? "text-yellow-500" : "text-gray-400"
        )}>
          {task.priority}
        </span>
      </div>
      <div className="shrink-0 flex gap-1">
        {LAYERS.map((l) => {
          const Icon = l.icon;
          const active = currentLayer === l.id;
          return (
            <button
              key={l.id}
              title={l.labelHe}
              onClick={() => onLayerChange(task.id, l.id)}
              className={clsx(
                "p-1.5 rounded-md border transition-all",
                active
                  ? clsx("border", l.bg, l.color, "shadow-sm")
                  : "border-transparent text-gray-300 dark:text-gray-600 hover:border-gray-200 dark:hover:border-gray-600 hover:text-gray-500"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────
function CategoryGroup({ category, tasks, pending, onLayerChange }: {
  category: string;
  tasks: Task[];
  pending: Record<string, TaskLayer>;
  onLayerChange: (id: string, layer: TaskLayer) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const label = categoryLabels[category as TaskCategory] ?? category;
  const catColor = categoryColors[category as TaskCategory] ?? "bg-gray-100 text-gray-600";
  const changedCount = tasks.filter((t) => pending[t.id] && pending[t.id] !== t.layer).length;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors mb-1"
      >
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronUp className="w-4 h-4 text-gray-400" />
        }
        <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded", catColor)}>{label}</span>
        <span className="text-xs text-gray-400">{tasks.length} משימות</span>
        {changedCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
            {changedCount} שינויים
          </span>
        )}
      </button>
      {!collapsed && (
        <div className="space-y-0.5 pl-2">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              pendingLayer={pending[t.id]}
              onLayerChange={onLayerChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ tasks, pending }: { tasks: Task[]; pending: Record<string, TaskLayer> }) {
  const counts = LAYERS.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.id]: 0 }), {});
  tasks.forEach((t) => {
    const layer = pending[t.id] ?? t.layer ?? "nice_to_have";
    counts[layer] = (counts[layer] ?? 0) + 1;
  });

  return (
    <div className="flex gap-3 flex-wrap mb-6">
      {LAYERS.map((l) => {
        const Icon = l.icon;
        return (
          <div key={l.id} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium", l.bg, l.color)}>
            <Icon className="w-3.5 h-3.5" />
            <span>{l.labelHe}</span>
            <span className="font-bold">{counts[l.id] ?? 0}</span>
          </div>
        );
      })}
      {Object.keys(pending).length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-300 text-sm font-medium">
          ✏️ לא שמור: {Object.keys(pending).length}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TriagePage() {
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks?limit=500", fetcher);
  const [pending, setPending] = useState<Record<string, TaskLayer>>({});
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [filterLayer, setFilterLayer] = useState<TaskLayer | "all">("all");

  const handleLayerChange = useCallback((id: string, layer: TaskLayer) => {
    setPending((p) => ({ ...p, [id]: layer }));
  }, []);

  const handleBrainDumpUpdates = useCallback((updates: { id: string; layer: TaskLayer }[]) => {
    setPending((p) => {
      const next = { ...p };
      updates.forEach(({ id, layer }) => { next[id] = layer; });
      return next;
    });
  }, []);

  const save = async () => {
    const updates = Object.entries(pending).map(([id, layer]) => ({ id, layer }));
    if (!updates.length) return;
    setSaving(true);
    try {
      await fetch("/api/triage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      setSavedCount(updates.length);
      setPending({});
      mutate();
    } finally {
      setSaving(false);
    }
  };

  // Mobile: save one card immediately
  const handleMobileSave = async (id: string, layer: TaskLayer) => {
    await fetch("/api/triage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: [{ id, layer }] }),
    });
    mutate();
  };

  const filtered = filterLayer === "all"
    ? tasks
    : tasks.filter((t) => (pending[t.id] ?? t.layer ?? "nice_to_have") === filterLayer);

  const byCategory = filtered.reduce<Record<string, Task[]>>((acc, t) => {
    const cat = t.category ?? "other";
    (acc[cat] ??= []).push(t);
    return acc;
  }, {});

  const pendingCount = Object.keys(pending).length;

  return (
    <>
      {/* ── MOBILE VIEW (< md) ── */}
      <div className="md:hidden">
        <MobileTriageView tasks={tasks} onSaveLayer={handleMobileSave} />
      </div>

      {/* ── DESKTOP VIEW (md+) ── */}
      <div className="hidden md:block p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">טריאז׳ משימות</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tasks.length} משימות — סווג כל משימה לשכבה הנכונה
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving || pendingCount === 0}
            className={clsx(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm",
              pendingCount > 0
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : `שמור${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
          </button>
        </div>

        {savedCount > 0 && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-medium">
            ✓ {savedCount} משימות עודכנו בהצלחה
          </div>
        )}

        {/* Brain Dump */}
        <BrainDump tasks={tasks} onUpdates={handleBrainDumpUpdates} />

        {/* Stats */}
        <StatsBar tasks={tasks} pending={pending} />

        {/* Layer filter tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setFilterLayer("all")}
            className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              filterLayer === "all"
                ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
            )}
          >
            הכל ({tasks.length})
          </button>
          {LAYERS.map((l) => {
            const count = tasks.filter((t) => (pending[t.id] ?? t.layer ?? "nice_to_have") === l.id).length;
            return (
              <button
                key={l.id}
                onClick={() => setFilterLayer(l.id)}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  filterLayer === l.id
                    ? clsx(l.bg, l.color, "border-current")
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                )}
              >
                {l.labelHe} ({count})
              </button>
            );
          })}
        </div>

        {/* Task groups */}
        <div>
          {Object.entries(byCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, catTasks]) => (
              <CategoryGroup
                key={cat}
                category={cat}
                tasks={catTasks}
                pending={pending}
                onLayerChange={handleLayerChange}
              />
            ))}
        </div>
      </div>
    </>
  );
}
