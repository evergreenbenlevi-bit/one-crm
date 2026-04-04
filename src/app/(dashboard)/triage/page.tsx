"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskCategory, TaskPriority, TaskOwner, TaskStatus, TaskImpact, TaskSize } from "@/lib/types/tasks";
import {
  categoryLabels, categoryColors, priorityLabels, priorityColors,
  ownerLabels, ownerIcons, statusLabels, CRM_CATEGORIES, TASK_STATUSES,
  impactLabels, impactColors, IMPACT_OPTIONS,
  sizeLabels, sizeColors, SIZE_OPTIONS,
} from "@/lib/types/tasks";
import {
  Bot, Hand, Trash2, Check, CheckCheck, SkipForward, ChevronUp,
  Calendar, Pencil, Filter, FileDown,
  Keyboard, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────
type QuickAction = "claude" | "ben" | "done" | "delete" | "skip" | "confirm";
type FilterMode = "all" | "untriaged" | "overdue" | "no_owner" | "ben" | "claude";

const FILTER_OPTIONS: { id: FilterMode; label: string; count?: (tasks: Task[]) => number }[] = [
  { id: "all", label: "הכל" },
  { id: "untriaged", label: "לא ממוין" },
  { id: "overdue", label: "באיחור" },
  { id: "no_owner", label: "ללא אחראי" },
  { id: "ben", label: "בן" },
  { id: "claude", label: "Claude" },
];

// ─── Swipe threshold ────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 100;

// ─── Circular Progress Ring ─────────────────────────────────────────────────
function ProgressRing({ current, total, size = 44, stroke = 3 }: { current: number; total: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = total > 0 ? current / total : 0;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0c99e9" />
            <stop offset="100%" stopColor="#7ccbfc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white/70 tabular-nums">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Segmented Control ──────────────────────────────────────────────────────
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  colors,
}: {
  options: T[];
  value: T | null | undefined;
  onChange: (val: T) => void;
  labels: Record<T, string>;
  colors: Record<T, { active: string; ring: string }>;
}) {
  return (
    <div className="flex rounded-xl bg-white/[0.04] p-1 gap-1">
      {options.map((opt) => {
        const isActive = value === opt;
        const c = colors[opt];
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={clsx(
              "flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.97]",
              isActive
                ? clsx(c.active, "shadow-lg")
                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            )}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Impact/Size color maps ─────────────────────────────────────────────────
const impactSegmentColors: Record<TaskImpact, { active: string; ring: string }> = {
  needle_mover: { active: "bg-red-500/20 text-red-300 ring-1 ring-red-500/30", ring: "ring-red-500" },
  important: { active: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30", ring: "ring-amber-500" },
  nice: { active: "bg-white/10 text-white/70 ring-1 ring-white/20", ring: "ring-white/40" },
};

const sizeSegmentColors: Record<TaskSize, { active: string; ring: string }> = {
  quick: { active: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30", ring: "ring-emerald-500" },
  medium: { active: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30", ring: "ring-amber-500" },
  big: { active: "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30", ring: "ring-purple-500" },
};

// ─── Triage Card ────────────────────────────────────────────────────────────
function TriageCard({
  task,
  index,
  total,
  onAction,
  onUpdate,
  onNext,
  onImpactChange,
  onSizeChange,
  direction,
}: {
  task: Task;
  index: number;
  total: number;
  onAction: (action: QuickAction, extra?: Record<string, unknown>) => Promise<void>;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  onNext: () => void;
  onImpactChange: (impact: TaskImpact) => Promise<void>;
  onSizeChange: (size: TaskSize) => Promise<void>;
  direction: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"ben" | "date-only">("date-only");
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

  // Swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Keyboard E toggle
  useEffect(() => {
    function onToggle() { setExpanded(e => !e); }
    document.addEventListener("triage-toggle-expand", onToggle);
    return () => document.removeEventListener("triage-toggle-expand", onToggle);
  }, []);

  useEffect(() => {
    setExpanded(false);
    setShowDatePicker(false);
    setDatePickerMode("date-only");
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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const catLabel = categoryLabels[task.category] ?? task.category;

  async function handleQuickAction(action: QuickAction) {
    if (saving) return;
    setSaving(true);
    try {
      if (action === "ben" && !showDatePicker) {
        setDatePickerMode("ben");
        setShowDatePicker(true);
        setSaving(false);
        return;
      }
      await onAction(action, action === "ben" ? { due_date: dueDate, due_time: dueTime } : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDateConfirm() {
    setSaving(true);
    try {
      if (datePickerMode === "ben") {
        await onAction("ben", { due_date: dueDate, due_time: dueTime });
      } else {
        // Date-only — just update the due_date without changing owner
        await onUpdate({ due_date: dueDate || null } as Partial<Task>);
      }
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

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      handleQuickAction("skip");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      handleQuickAction("done");
    }
  }

  // Card enter/exit animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? 15 : -15,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? -15 : 15,
    }),
  };

  const impactShortLabels: Record<TaskImpact, string> = {
    needle_mover: "🔴 מזיז",
    important: "🟡 חשוב",
    nice: "⚪ נחמד",
  };

  const sizeShortLabels: Record<TaskSize, string> = {
    quick: "⚡ מהיר",
    medium: "📋 בינוני",
    big: "🏗️ גדול",
  };

  return (
    <motion.div
      key={task.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={!expanded && !showDatePicker ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity }}
      className="w-full max-w-xl mx-auto cursor-grab active:cursor-grabbing"
    >
      {/* Glass Card */}
      <div className={clsx(
        "relative rounded-3xl overflow-hidden",
        "bg-gradient-to-b from-white/[0.08] to-white/[0.03]",
        "backdrop-blur-xl",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}>
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

        {/* Header row */}
        <div className="px-5 pt-4 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold ring-1 ring-red-500/20">
                באיחור
              </span>
            )}
            {task.status === "in_progress" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold ring-1 ring-amber-500/20 animate-pulse">
                בביצוע
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-white/30 tabular-nums">
              {index + 1}/{total}
            </span>
            <button
              onClick={() => { setShowDatePicker(d => !d); setExpanded(false); }}
              className={clsx(
                "p-1.5 rounded-lg transition-colors",
                showDatePicker ? "bg-brand-500/15 text-brand-400" : "hover:bg-white/[0.06] text-white/40"
              )}
              title="תאריך"
            >
              <Calendar size={13} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              title="E"
            >
              {expanded ? <ChevronUp size={14} className="text-white/40" /> : <Pencil size={13} className="text-white/40" />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 pt-5 pb-4 min-h-[180px]">
          {/* Category pill */}
          <div className="flex items-center gap-2 mb-3">
            <span className={clsx(
              "text-[10px] px-2.5 py-0.5 rounded-full font-medium",
              categoryColors[task.category]
            )}>
              {catLabel}
            </span>
            {task.due_date && !isOverdue && (
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(task.due_date).toLocaleDateString("he-IL")}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30 font-medium">
              {ownerIcons[task.owner]} {ownerLabels[task.owner]}
            </span>
          </div>

          {/* Title */}
          {expanded ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold text-white bg-transparent border-b border-white/10 pb-2 mb-2 outline-none focus:border-brand-400/50 text-right"
              dir="auto"
            />
          ) : (
            <h2 className="text-xl font-bold text-white leading-relaxed text-right tracking-tight" dir="auto">
              {task.title}
            </h2>
          )}

          {/* Description */}
          {expanded ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm text-white/60 bg-white/[0.04] rounded-xl p-3 mt-2 resize-none outline-none focus:ring-1 focus:ring-brand-400/30 border border-white/[0.06]"
              placeholder="פרטים..."
              dir="auto"
            />
          ) : task.description ? (
            <p className="text-sm text-white/40 mt-2 line-clamp-3 text-right leading-relaxed" dir="auto">
              {task.description}
            </p>
          ) : null}

          {/* Tags */}
          {!expanded && task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
              {task.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/30 border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Expanded edit fields */}
          {expanded && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30">
                  {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={owner} onChange={(e) => setOwner(e.target.value as TaskOwner)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30">
                  {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{ownerIcons[k as TaskOwner]} {v}</option>)}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30">
                  {CRM_CATEGORIES.map(k => <option key={k} value={k}>{categoryLabels[k]}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30">
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 mb-1 block">דדליין</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30" />
                </div>
                <div className="flex-none self-end">
                  <button onClick={handleSaveEdits} disabled={saving}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20">
                    {saving ? "..." : "שמור"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date picker overlay for "Ben" */}
        <AnimatePresence>
          {showDatePicker && !expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5 pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-white/40 mb-3 text-right font-medium">
                  {datePickerMode === "ben" ? "מתי אתה עושה את זה?" : "הגדר תאריך"}
                </p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30" />
                  </div>
                  <div className="w-24">
                    <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 outline-none focus:border-brand-400/30" />
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
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
                          "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                          dueDate === val
                            ? "bg-brand-500/20 border-brand-500/30 text-brand-300"
                            : "border-white/[0.08] text-white/40 hover:border-white/20"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 font-medium hover:bg-white/[0.04] transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDateConfirm}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20"
                  >
                    {saving ? "..." : "אישור"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact + Size segmented controls */}
        {!expanded && !showDatePicker && (
          <div className="px-6 pb-5 pt-2 space-y-3">
            <div>
              <p className="text-[10px] text-white/25 mb-1.5 text-center font-medium tracking-wider uppercase">חשיבות</p>
              <SegmentedControl
                options={IMPACT_OPTIONS}
                value={task.impact}
                onChange={onImpactChange}
                labels={impactShortLabels}
                colors={impactSegmentColors}
              />
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1.5 text-center font-medium tracking-wider uppercase">גודל</p>
              <SegmentedControl
                options={SIZE_OPTIONS}
                value={task.size}
                onChange={onSizeChange}
                labels={sizeShortLabels}
                colors={sizeSegmentColors}
              />
            </div>
          </div>
        )}

        {/* Action Buttons — inside card on desktop */}
        {!expanded && !showDatePicker && (
          <div className="hidden md:block px-6 pb-5 pt-1">
            <ActionButtons onAction={handleQuickAction} saving={saving} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Action Buttons ─────────────────────────────────────────────────────────
function ActionButtons({ onAction, saving }: { onAction: (action: QuickAction) => void; saving: boolean }) {
  const actions: { id: QuickAction; label: string; shortcut: string; icon: typeof Bot; color: string }[] = [
    { id: "claude", label: "Claude", shortcut: "1", icon: Bot, color: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 ring-blue-500/20" },
    { id: "ben", label: "אני", shortcut: "2", icon: Hand, color: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 ring-amber-500/20" },
    { id: "done", label: "בוצע", shortcut: "3", icon: Check, color: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 ring-emerald-500/20" },
    { id: "confirm", label: "מאושר", shortcut: "4", icon: CheckCheck, color: "bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 ring-brand-500/20" },
    { id: "delete", label: "מחק", shortcut: "5", icon: Trash2, color: "bg-red-500/15 text-red-400 hover:bg-red-500/25 ring-red-500/20" },
    { id: "skip", label: "דלג", shortcut: "6", icon: SkipForward, color: "bg-white/[0.06] text-white/50 hover:bg-white/[0.10] ring-white/10" },
  ];

  return (
    <div className="flex gap-2">
      {actions.map(({ id, label, shortcut, icon: Icon, color }) => (
        <button
          key={id}
          onClick={() => onAction(id)}
          disabled={saving}
          className={clsx(
            "flex-1 flex flex-col items-center gap-1.5 py-3 md:py-3 rounded-2xl ring-1 transition-all duration-150 active:scale-[0.95] disabled:opacity-40",
            color
          )}
        >
          <Icon size={20} strokeWidth={2} />
          <span className="text-[10px] font-bold">{label}</span>
          <span className="text-[8px] font-mono opacity-40 hidden md:block">{shortcut}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Stats Strip ────────────────────────────────────────────────────────────
function StatsStrip({ total, done, skipped, deleted }: { total: number; done: number; skipped: number; deleted: number }) {
  if (done === 0 && skipped === 0 && deleted === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 text-[11px] justify-center"
    >
      {done > 0 && (
        <span className="text-emerald-400/70 tabular-nums flex items-center gap-1">
          <Check size={12} /> {done}
        </span>
      )}
      {deleted > 0 && (
        <span className="text-red-400/70 tabular-nums flex items-center gap-1">
          <Trash2 size={12} /> {deleted}
        </span>
      )}
      {skipped > 0 && (
        <span className="text-white/30 tabular-nums flex items-center gap-1">
          <SkipForward size={12} /> {skipped}
        </span>
      )}
    </motion.div>
  );
}

// ─── Completion Screen ──────────────────────────────────────────────────────
function CompletionScreen({ stats, onReset, onResetAll }: {
  stats: { done: number; skipped: number; deleted: number };
  onReset: () => void;
  onResetAll: () => void;
}) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="text-center space-y-6 max-w-sm mx-auto"
    >
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-brand-400/20 to-emerald-400/20 flex items-center justify-center ring-1 ring-white/[0.08]">
          <Sparkles size={36} className="text-brand-300" />
        </div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">סיימת!</h2>
        <p className="text-sm text-white/30 mt-1">כל הכרטיסים עברו טריאז׳</p>
      </div>

      <div className="flex items-center justify-center gap-6 text-sm">
        {stats.done > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.done}</span>
            <span className="text-[10px] text-white/30">עודכנו</span>
          </motion.div>
        )}
        {stats.deleted > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-red-400 tabular-nums">{stats.deleted}</span>
            <span className="text-[10px] text-white/30">נמחקו</span>
          </motion.div>
        )}
        {stats.skipped > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-white/50 tabular-nums">{stats.skipped}</span>
            <span className="text-[10px] text-white/30">דולגו</span>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/20"
        >
          עוד סבב
        </button>
        <button
          onClick={onResetAll}
          className="px-6 py-2.5 rounded-xl border border-white/[0.08] text-white/50 font-semibold text-sm hover:bg-white/[0.04] transition-colors"
        >
          אפס פילטרים
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function TriagePage() {
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks?limit=500", fetcher);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [stats, setStats] = useState({ done: 0, skipped: 0, deleted: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Filter tasks
  const openTasks = tasks.filter(t => t.status !== "done" && t.status !== "archived" && t.status !== "someday");
  const now = new Date();

  const filtered = openTasks.filter(t => {
    if (filter === "untriaged" && t.effort) return false;
    if (filter === "overdue" && (!t.due_date || new Date(t.due_date) >= now)) return false;
    if (filter === "no_owner" && t.owner) return false;
    if (filter === "ben" && t.owner !== "ben") return false;
    if (filter === "claude" && t.owner !== "claude") return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aOverdue = a.due_date && new Date(a.due_date) < now ? 1 : 0;
    const bOverdue = b.due_date && new Date(b.due_date) < now ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;
    const priOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2 };
    if (priOrder[a.priority] !== priOrder[b.priority]) return priOrder[a.priority] - priOrder[b.priority];
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const current = sorted[currentIndex];

  function advance(dir = 1) {
    setDirection(dir);
    if (currentIndex < sorted.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentIndex(sorted.length);
    }
  }

  const handleAction = useCallback(async (action: QuickAction, extra?: Record<string, unknown>) => {
    if (!current) return;

    if (action === "skip") {
      setStats(s => ({ ...s, skipped: s.skipped + 1 }));
      advance(1);
      return;
    }

    if (action === "delete") {
      await fetch(`/api/tasks?id=${current.id}`, { method: "DELETE" });
      setStats(s => ({ ...s, deleted: s.deleted + 1 }));
      setDirection(-1);
      await mutate();
      return;
    }

    if (action === "confirm") {
      // Task is already triaged correctly — just advance
      setStats(s => ({ ...s, done: s.done + 1 }));
      setDirection(1);
      advance(1);
      return;
    }

    if (action === "done") {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, status: "done" }),
      });
      setStats(s => ({ ...s, done: s.done + 1 }));
      setDirection(1);
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
      setDirection(1);
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
      setDirection(1);
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
    advance(1);
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

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const isComplete = !current || currentIndex >= sorted.length;
      if (isComplete) return;

      switch (e.key) {
        case "1": handleAction("claude"); break;
        case "2": handleAction("ben"); break;
        case "3": handleAction("done"); break;
        case "4": handleAction("confirm"); break;
        case "5": handleAction("delete"); break;
        case "6": handleAction("skip"); break;
        case "e":
        case "E":
          // Toggle expand handled by card internally — dispatch custom event
          document.dispatchEvent(new CustomEvent("triage-toggle-expand"));
          break;
        case "?":
          setShowShortcuts(s => !s);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction, current, currentIndex, sorted.length]);

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setStats({ done: 0, skipped: 0, deleted: 0 });
  }, [filter, categoryFilter]);

  const isComplete = !current || currentIndex >= sorted.length;
  const progress = sorted.length > 0 ? currentIndex / sorted.length : 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2 md:px-8 md:pt-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ProgressRing current={currentIndex} total={sorted.length} />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">טריאז׳</h1>
              <p className="text-[11px] text-white/30 mt-0.5 tabular-nums">
                {sorted.length} משימות
                {currentIndex > 0 && <span className="text-white/20"> · {sorted.length - currentIndex} נותרו</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                // Export HTML report
                const grouped: Record<string, Task[]> = {};
                openTasks.forEach(t => {
                  const cat = categoryLabels[t.category] || t.category;
                  (grouped[cat] ??= []).push(t);
                });
                const priLabel: Record<string, string> = { p1: "P1", p2: "P2", p3: "P3" };
                const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>דוח משימות — ${new Date().toLocaleDateString("he-IL")}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#e5e5e5;background:#0a0a0a}h1{font-size:22px;border-bottom:1px solid #333;padding-bottom:8px}h2{font-size:15px;color:#888;margin-top:24px;padding:6px 12px;background:#1a1a1a;border-radius:8px}.task{padding:8px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:8px;align-items:baseline}.pri{font-size:11px;font-weight:700;color:#666}.title{flex:1}.owner{font-size:11px;color:#555}</style></head><body><h1>דוח משימות — ${new Date().toLocaleDateString("he-IL")}</h1><p style="color:#666;font-size:13px">${openTasks.length} משימות פתוחות</p>${Object.entries(grouped).map(([cat, ts]) => `<h2>${cat} (${ts.length})</h2>${ts.sort((a, b) => a.priority.localeCompare(b.priority)).map(t => `<div class="task"><span class="pri">${priLabel[t.priority] || t.priority}</span><span class="title">${t.title}</span><span class="owner">${t.owner === "ben" ? "בן" : "Claude"}</span></div>`).join("")}`).join("")}</body></html>`;
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `tasks-${new Date().toISOString().split("T")[0]}.html`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="ייצוא דוח"
              className="p-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
            >
              <FileDown size={16} />
            </button>
            <button
              onClick={() => setShowShortcuts(s => !s)}
              title="קיצורי מקלדת (?)"
              className="p-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors hidden md:flex"
            >
              <Keyboard size={16} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "p-2 rounded-xl transition-colors",
                showFilters
                  ? "bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/20"
                  : "text-white/25 hover:text-white/50 hover:bg-white/[0.04]"
              )}
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-3 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all",
                        filter === f.id
                          ? "bg-white/[0.12] text-white ring-1 ring-white/[0.15]"
                          : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
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
                      "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
                      categoryFilter === "all"
                        ? "bg-white/[0.10] text-white/80"
                        : "text-white/25 hover:text-white/40"
                    )}
                  >
                    הכל
                  </button>
                  {CRM_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
                        categoryFilter === cat
                          ? clsx(categoryColors[cat])
                          : "text-white/25 hover:text-white/40"
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
          <div className="mb-2">
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        <StatsStrip total={sorted.length - currentIndex} done={stats.done} skipped={stats.skipped} deleted={stats.deleted} />
      </div>

      {/* Card area */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-4 md:px-8 pb-28 md:pb-4">
        <AnimatePresence mode="wait" custom={direction}>
          {isComplete ? (
            <CompletionScreen
              stats={stats}
              onReset={() => { setCurrentIndex(0); setStats({ done: 0, skipped: 0, deleted: 0 }); }}
              onResetAll={() => { setFilter("all"); setCategoryFilter("all"); setCurrentIndex(0); setStats({ done: 0, skipped: 0, deleted: 0 }); }}
            />
          ) : current ? (
            <TriageCard
              key={current.id}
              task={current}
              index={currentIndex}
              total={sorted.length}
              onAction={handleAction}
              onUpdate={handleUpdate}
              onNext={() => advance(1)}
              onImpactChange={handleImpactChange}
              onSizeChange={handleSizeChange}
              direction={direction}
            />
          ) : null}
        </AnimatePresence>
      </div>

      {/* Mobile fixed bottom action bar */}
      {!isComplete && current && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-3 pt-2 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
          <ActionButtons onAction={(action) => {
            if (!current) return;
            if (action === "ben") {
              // Trigger date picker inside card — we handle via direct action
              handleAction(action);
              return;
            }
            handleAction(action);
          }} saving={false} />
        </div>
      )}

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl border border-white/[0.08] p-6 max-w-xs w-full shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-4">קיצורי מקלדת</h3>
              <div className="space-y-2.5 text-xs">
                {[
                  ["1", "Claude"],
                  ["2", "אני (בן)"],
                  ["3", "בוצע"],
                  ["4", "מאושר ✓"],
                  ["5", "מחק"],
                  ["6", "דלג"],
                  ["E", "עריכה"],
                  ["?", "קיצורים"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-white/40">{label}</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white/60 font-mono text-[10px] border border-white/[0.08]">{key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
