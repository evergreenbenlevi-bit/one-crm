"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskLayer, TaskCategory, TaskPriority, TaskOwner, TaskStatus, TaskEffort, TaskImpact, TaskSize } from "@/lib/types/tasks";
import {
  categoryLabels, categoryColors, priorityLabels, priorityColors,
  ownerLabels, ownerIcons, statusLabels, CRM_CATEGORIES, TASK_STATUSES,
  effortLabels, effortColors, EFFORT_OPTIONS,
  impactLabels, impactColors, IMPACT_OPTIONS,
  sizeLabels, sizeColors, SIZE_OPTIONS,
} from "@/lib/types/tasks";
import {
  Bot, Hand, Trash2, Check, SkipForward, ChevronDown, ChevronUp,
  Calendar, Clock, Pencil, X, Save, Filter, Layers, Zap, Archive, FileDown,
} from "lucide-react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ActiveSessions } from "@/components/tasks/active-sessions";

// ─── Quick action types ──────────────────────────────────────────────────────
type QuickAction = "claude" | "ben" | "done" | "delete" | "skip";

// ─── Filter options ──────────────────────────────────────────────────────────
type FilterMode = "all" | "untriaged" | "overdue" | "no_owner" | "ben" | "claude";

const FILTER_OPTIONS: { id: FilterMode; label: string; icon?: typeof Bot }[] = [
  { id: "all", label: "הכל (מיון מחדש)" },
  { id: "untriaged", label: "ללא effort" },
  { id: "overdue", label: "באיחור" },
  { id: "no_owner", label: "ללא אחראי" },
  { id: "ben", label: "🙋 של בן" },
  { id: "claude", label: "🤖 Claude" },
];

// ─── Triage Card ─────────────────────────────────────────────────────────────
function TriageCard({
  task,
  index,
  total,
  onAction,
  onUpdate,
  onNext,
  onEffortChange,
  onImpactChange,
  onSizeChange,
}: {
  task: Task;
  index: number;
  total: number;
  onAction: (action: QuickAction, extra?: Record<string, unknown>) => Promise<void>;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  onNext: () => void;
  onEffortChange: (effort: TaskEffort) => Promise<void>;
  onImpactChange: (impact: TaskImpact) => Promise<void>;
  onSizeChange: (size: TaskSize) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [owner, setOwner] = useState<TaskOwner>(task.owner);
  const [category, setCategory] = useState<TaskCategory>(task.category);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [impact, setImpact] = useState<TaskImpact>(task.impact || "important");
  const [size, setSize] = useState<TaskSize>(task.size || "medium");
  const [description, setDescription] = useState(task.description || "");
  const [title, setTitle] = useState(task.title);
  const dateRef = useRef<HTMLInputElement>(null);

  // Reset state when task changes
  useEffect(() => {
    setExpanded(false);
    setShowDatePicker(false);
    setSaving(false);
    setDueDate(task.due_date || "");
    setDueTime("");
    setPriority(task.priority);
    setOwner(task.owner);
    setCategory(task.category);
    setStatus(task.status);
    setImpact(task.impact || "important");
    setSize(task.size || "medium");
    setDescription(task.description || "");
    setTitle(task.title);
  }, [task.id]);

  const catColor = categoryColors[task.category] ?? "bg-gray-100 text-gray-600";
  const prioColor = priorityColors[task.priority] ?? "bg-gray-100 text-gray-600";
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  async function handleQuickAction(action: QuickAction) {
    if (saving) return;
    setSaving(true);
    try {
      if (action === "ben" && !showDatePicker) {
        setShowDatePicker(true);
        setSaving(false);
        return;
      }
      await onAction(action, action === "ben" ? { due_date: dueDate, due_time: dueTime } : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleBenConfirm() {
    setSaving(true);
    try {
      await onAction("ben", { due_date: dueDate, due_time: dueTime });
    } finally {
      setSaving(false);
      setShowDatePicker(false);
    }
  }

  async function handleSaveEdits() {
    setSaving(true);
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        owner,
        category,
        status,
        impact,
        size,
        due_date: dueDate || null,
      } as Partial<Task>);
    } finally {
      setSaving(false);
      setExpanded(false);
    }
  }

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Card header — counter */}
        <div className="px-4 pt-3 pb-0 flex items-center justify-between">
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
            {index + 1} / {total}
          </span>
          <div className="flex gap-1.5">
            {task.status === "in_progress" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold animate-pulse">
                בביצוע
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                באיחור
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <Pencil size={14} className="text-gray-400" />}
          </button>
        </div>

        {/* Main content */}
        <div className="px-6 py-4">
          {/* Title */}
          {expanded ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-600 pb-1 mb-2 outline-none focus:border-brand-500 text-right"
              dir="auto"
            />
          ) : (
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug text-right" dir="auto">
              {task.title}
            </h2>
          )}

          {/* Description */}
          {expanded ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-2 resize-none outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="פרטים..."
              dir="auto"
            />
          ) : task.description ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-4 text-right leading-relaxed" dir="auto">
              {task.description}
            </p>
          ) : null}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4 justify-end">
            {expanded ? (
              <>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value as TaskOwner)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{ownerIcons[k as TaskOwner]} {v}</option>)}
                </select>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {CRM_CATEGORIES.map(k => <option key={k} value={k}>{categoryLabels[k]}</option>)}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as TaskImpact)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {IMPACT_OPTIONS.map(i => <option key={i} value={i}>{impactLabels[i]}</option>)}
                </select>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as TaskSize)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {SIZE_OPTIONS.map(s => <option key={s} value={s}>{sizeLabels[s]}</option>)}
                </select>
              </>
            ) : (
              <>
                <span className={clsx("text-[11px] px-2.5 py-1 rounded-full font-semibold", prioColor)}>
                  {task.priority.toUpperCase()}
                </span>
                <span className={clsx("text-[11px] px-2.5 py-1 rounded-full font-medium", catColor)}>
                  {categoryLabels[task.category] ?? task.category}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                  {ownerIcons[task.owner]} {ownerLabels[task.owner]}
                </span>
                {task.due_date && (
                  <span className={clsx(
                    "text-[11px] px-2.5 py-1 rounded-full font-medium",
                    isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  )}>
                    📅 {new Date(task.due_date).toLocaleDateString("he-IL")}
                  </span>
                )}
                {task.impact && (
                  <span className={clsx("text-[11px] px-2.5 py-1 rounded-full font-semibold", impactColors[task.impact])}>
                    {impactLabels[task.impact]}
                  </span>
                )}
                {task.size && (
                  <span className={clsx("text-[11px] px-2.5 py-1 rounded-full font-medium", sizeColors[task.size])}>
                    {sizeLabels[task.size]}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-end">
              {task.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Expanded: date field */}
          {expanded && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-0.5 block">דדליין</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="flex-none">
                <label className="text-[10px] text-gray-400 mb-0.5 block">&nbsp;</label>
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? "..." : "שמור"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date picker for "אני עושה" */}
        <AnimatePresence>
          {showDatePicker && !expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 mb-2 text-right">מתי אתה עושה את זה?</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      ref={dateRef}
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-sm px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full text-sm px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {/* Quick date buttons */}
                  {["היום", "מחר", "ראשון"].map((label, i) => {
                    const d = new Date();
                    if (i === 1) d.setDate(d.getDate() + 1);
                    if (i === 2) { d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); }
                    const val = d.toISOString().split("T")[0];
                    return (
                      <button
                        key={label}
                        onClick={() => setDueDate(val)}
                        className={clsx(
                          "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                          dueDate === val
                            ? "bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 font-medium"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleBenConfirm}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {saving ? "..." : "אישור"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact + Size quick selection */}
        {!expanded && !showDatePicker && (
          <div className="px-6 pb-3 pt-1 space-y-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center font-medium">כמה חשוב?</p>
              <div className="grid grid-cols-3 gap-2">
                {IMPACT_OPTIONS.map(imp => {
                  const isActive = task.impact === imp;
                  return (
                    <button
                      key={imp}
                      onClick={() => onImpactChange(imp)}
                      className={clsx(
                        "py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95",
                        isActive
                          ? clsx(impactColors[imp], "border-current shadow-md")
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-400"
                      )}
                    >
                      {impactLabels[imp]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center font-medium">כמה זמן?</p>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map(sz => {
                  const isActive = task.size === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => onSizeChange(sz)}
                      className={clsx(
                        "py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95",
                        isActive
                          ? clsx(sizeColors[sz], "border-current shadow-md")
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-400"
                      )}
                    >
                      {sizeLabels[sz]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick action buttons */}
        {!expanded && !showDatePicker && (
          <div className="px-6 pb-5 pt-2">
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => handleQuickAction("claude")}
                disabled={saving}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 active:scale-95 transition-all disabled:opacity-50"
              >
                <Bot size={20} />
                <span className="text-[10px] font-bold">Claude</span>
              </button>
              <button
                onClick={() => handleQuickAction("ben")}
                disabled={saving}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 active:scale-95 transition-all disabled:opacity-50"
              >
                <Hand size={20} />
                <span className="text-[10px] font-bold">אני</span>
              </button>
              <button
                onClick={() => handleQuickAction("done")}
                disabled={saving}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 active:scale-95 transition-all disabled:opacity-50"
              >
                <Check size={20} />
                <span className="text-[10px] font-bold">בוצע</span>
              </button>
              <button
                onClick={() => handleQuickAction("delete")}
                disabled={saving}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 active:scale-95 transition-all disabled:opacity-50"
              >
                <Trash2 size={20} />
                <span className="text-[10px] font-bold">מחק</span>
              </button>
              <button
                onClick={() => handleQuickAction("skip")}
                disabled={saving}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 active:scale-95 transition-all disabled:opacity-50"
              >
                <SkipForward size={20} />
                <span className="text-[10px] font-bold">דלג</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stats Strip ─────────────────────────────────────────────────────────────
function StatsStrip({ total, done, skipped, deleted }: { total: number; done: number; skipped: number; deleted: number }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 justify-center">
      {done > 0 && <span className="text-green-600 dark:text-green-400">✅ {done} עודכנו</span>}
      {deleted > 0 && <span className="text-red-500">🗑️ {deleted} נמחקו</span>}
      {skipped > 0 && <span className="text-amber-500">⏭️ {skipped} דולגו</span>}
      <span>{total} נותרו</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TriagePage() {
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks?limit=500", fetcher);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [stats, setStats] = useState({ done: 0, skipped: 0, deleted: 0 });
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks
  const openTasks = tasks.filter(t => t.status !== "done" && t.status !== "archived" && t.status !== "someday");
  const now = new Date();

  const filtered = openTasks.filter(t => {
    // Mode filter
    if (filter === "untriaged" && t.effort) return false;
    if (filter === "overdue" && (!t.due_date || new Date(t.due_date) >= now)) return false;
    if (filter === "no_owner" && t.owner) return false;
    if (filter === "ben" && t.owner !== "ben") return false;
    if (filter === "claude" && t.owner !== "claude") return false;
    // Category filter
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  // Sort: overdue first, then by priority, then by position
  const sorted = [...filtered].sort((a, b) => {
    const aOverdue = a.due_date && new Date(a.due_date) < now ? 1 : 0;
    const bOverdue = b.due_date && new Date(b.due_date) < now ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;
    const priOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2 };
    if (priOrder[a.priority] !== priOrder[b.priority]) return priOrder[a.priority] - priOrder[b.priority];
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const current = sorted[currentIndex];

  function advance() {
    if (currentIndex < sorted.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentIndex(sorted.length); // trigger completion screen
    }
  }

  const handleAction = useCallback(async (action: QuickAction, extra?: Record<string, unknown>) => {
    if (!current) return;

    if (action === "skip") {
      setStats(s => ({ ...s, skipped: s.skipped + 1 }));
      advance();
      return;
    }

    if (action === "delete") {
      await fetch(`/api/tasks?id=${current.id}`, { method: "DELETE" });
      setStats(s => ({ ...s, deleted: s.deleted + 1 }));
      await mutate();
      // Don't advance — mutate removes the item, so current index now points to next
      return;
    }

    if (action === "done") {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, status: "done" }),
      });
      setStats(s => ({ ...s, done: s.done + 1 }));
      await mutate();
      return;
    }

    if (action === "claude") {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, owner: "claude", status: "todo" }),
      });
      setStats(s => ({ ...s, done: s.done + 1 }));
      await mutate();
      return;
    }

    if (action === "ben") {
      const updates: Record<string, unknown> = {
        id: current.id,
        owner: "ben",
        status: "todo",
      };
      if (extra?.due_date) updates.due_date = extra.due_date;
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setStats(s => ({ ...s, done: s.done + 1 }));
      await mutate();
      return;
    }
  }, [current, mutate]);

  const handleUpdate = useCallback(async (updates: Partial<Task>) => {
    if (!current) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, ...updates }),
    });
    setStats(s => ({ ...s, done: s.done + 1 }));
    await mutate();
    advance();
  }, [current, mutate]);

  const handleEffortChange = useCallback(async (effort: TaskEffort) => {
    if (!current) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, effort }),
    });
    mutate();
  }, [current, mutate]);

  const handleImpactChange = useCallback(async (impact: TaskImpact) => {
    if (!current) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, impact }),
    });
    mutate();
  }, [current, mutate]);

  const handleSizeChange = useCallback(async (size: TaskSize) => {
    if (!current) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, size }),
    });
    mutate();
  }, [current, mutate]);

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setStats({ done: 0, skipped: 0, deleted: 0 });
  }, [filter, categoryFilter]);

  // Completion screen
  const isComplete = !current || currentIndex >= sorted.length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 md:px-8 md:pt-6 max-w-2xl mx-auto w-full">
        <ActiveSessions />
        <div className="flex items-center justify-between mb-3 mt-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">טריאז׳</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {sorted.length} משימות · קלף אחד, החלטה אחת
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Export tasks as styled HTML report
                const grouped: Record<string, Task[]> = {};
                openTasks.forEach(t => {
                  const cat = categoryLabels[t.category] || t.category;
                  (grouped[cat] ??= []).push(t);
                });
                const priLabel: Record<string, string> = { p1: "🔴 P1", p2: "🟡 P2", p3: "⚪ P3" };
                const effLabel: Record<string, string> = { quick: "⚡", small: "🕐", medium: "📋", large: "🏗️" };
                const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>דוח משימות — ${new Date().toLocaleDateString("he-IL")}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a;background:#fff}h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:16px;color:#555;margin-top:24px;padding:6px 12px;background:#f5f5f5;border-radius:8px}.task{padding:8px 0;border-bottom:1px solid #eee;display:flex;gap:8px;align-items:baseline}.pri{font-size:12px;font-weight:700}.eff{font-size:11px;color:#888}.title{flex:1}.owner{font-size:12px;color:#999}.meta{font-size:11px;color:#aaa;margin-top:4px}</style></head><body><h1>דוח משימות — ${new Date().toLocaleDateString("he-IL")}</h1><p style="color:#888;font-size:13px">${openTasks.length} משימות פתוחות</p>${Object.entries(grouped).map(([cat, tasks]) => `<h2>${cat} (${tasks.length})</h2>${tasks.sort((a,b) => a.priority.localeCompare(b.priority)).map(t => `<div class="task"><span class="pri">${priLabel[t.priority] || t.priority}</span><span class="eff">${effLabel[t.effort || ""] || ""}</span><span class="title">${t.title}</span><span class="owner">${t.owner === "ben" ? "🙋" : "🤖"}</span></div>`).join("")}`).join("")}</body></html>`;
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `tasks-report-${new Date().toISOString().split("T")[0]}.html`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="ייצוא דוח"
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FileDown size={18} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "p-2 rounded-lg border transition-colors",
                showFilters
                  ? "bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-600"
                  : "border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600"
              )}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pb-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        filter === f.id
                          ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors",
                      categoryFilter === "all"
                        ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800"
                        : "border-gray-200 dark:border-gray-700 text-gray-400"
                    )}
                  >
                    כל הקטגוריות
                  </button>
                  {CRM_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors",
                        categoryFilter === cat
                          ? clsx(categoryColors[cat], "border-current")
                          : "border-gray-200 dark:border-gray-700 text-gray-400"
                      )}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {!isComplete && (
          <div className="mb-1">
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${sorted.length > 0 ? (currentIndex / sorted.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <StatsStrip total={sorted.length - currentIndex} done={stats.done} skipped={stats.skipped} deleted={stats.deleted} />
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 md:px-8">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="text-5xl">🎯</div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">סיימת!</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                {stats.done > 0 && <p>✅ {stats.done} משימות עודכנו</p>}
                {stats.deleted > 0 && <p>🗑️ {stats.deleted} משימות נמחקו</p>}
                {stats.skipped > 0 && <p>⏭️ {stats.skipped} משימות דולגו</p>}
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => { setCurrentIndex(0); setStats({ done: 0, skipped: 0, deleted: 0 }); }}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
                >
                  עוד סבב
                </button>
                <button
                  onClick={() => { setFilter("all"); setCategoryFilter("all"); setCurrentIndex(0); setStats({ done: 0, skipped: 0, deleted: 0 }); }}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  אפס פילטרים
                </button>
              </div>
            </motion.div>
          ) : current ? (
            <TriageCard
              key={current.id}
              task={current}
              index={currentIndex}
              total={sorted.length}
              onAction={handleAction}
              onUpdate={handleUpdate}
              onNext={advance}
              onEffortChange={handleEffortChange}
              onImpactChange={handleImpactChange}
              onSizeChange={handleSizeChange}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
