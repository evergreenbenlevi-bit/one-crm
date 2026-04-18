"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { Plus, FolderKanban, X } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { fetcher } from "@/lib/fetcher";
import type { Task } from "@/lib/types/tasks";

type ProjectStatus = "active" | "paused" | "done" | "archived";
type ProjectPriority = "p1" | "p2" | "p3";
type Portfolio = "one" | "solo" | "harness" | "exploratory";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  portfolio: Portfolio | null;
  owner: string;
  deadline: string | null;
  estimated_minutes: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  done: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "פעיל",
  paused: "מושהה",
  done: "הושלם",
  archived: "בארכיון",
};

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  p1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  p2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  p3: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const PORTFOLIO_COLORS: Record<Portfolio, string> = {
  one: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  solo: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  harness: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  exploratory: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

const PORTFOLIO_LABELS: Record<Portfolio, string> = {
  one: "ONE™",
  solo: "Solo",
  harness: "Harness",
  exploratory: "Exploratory",
};

type FilterStatus = "all" | ProjectStatus;
type FilterPortfolio = "all" | Portfolio;

const STATUS_FILTERS: { id: FilterStatus; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "active", label: "פעיל" },
  { id: "paused", label: "מושהה" },
  { id: "done", label: "הושלמו" },
  { id: "archived", label: "ארכיון" },
];

const PORTFOLIO_FILTERS: { id: FilterPortfolio; label: string }[] = [
  { id: "all", label: "כל ה-Portfolios" },
  { id: "one", label: "ONE™" },
  { id: "solo", label: "Solo" },
  { id: "harness", label: "Harness" },
  { id: "exploratory", label: "Exploratory" },
];

const FIELD_CLASS = "w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none";
const LABEL_CLASS = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block";

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<ProjectPriority>("p2");
  const [portfolio, setPortfolio] = useState<Portfolio | "">("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          portfolio: portfolio || null,
          deadline: deadline || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "שגיאה ביצירת פרויקט");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת פרויקט");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold dark:text-gray-100">פרויקט חדש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <input
            autoFocus
            type="text"
            placeholder="שם הפרויקט..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={clsx(FIELD_CLASS, "font-medium")}
            required
          />
          <textarea
            placeholder="תיאור (אופציונלי)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={clsx(FIELD_CLASS, "resize-none")}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>עדיפות</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as ProjectPriority)} className={FIELD_CLASS}>
                <option value="p1">P1 — קריטי</option>
                <option value="p2">P2 — חשוב</option>
                <option value="p3">P3 — Nice to have</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>סטטוס</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={FIELD_CLASS}>
                <option value="active">פעיל</option>
                <option value="paused">מושהה</option>
                <option value="done">הושלם</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Portfolio</label>
              <select value={portfolio} onChange={(e) => setPortfolio(e.target.value as Portfolio | "")} className={FIELD_CLASS}>
                <option value="">— ללא —</option>
                <option value="one">ONE™</option>
                <option value="solo">Solo</option>
                <option value="harness">Harness</option>
                <option value="exploratory">Exploratory</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>דדליין</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={FIELD_CLASS} />
            </div>
          </div>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {saving ? "שומר..." : "צור פרויקט"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filterStatus = (searchParams.get("status") as FilterStatus) || "all";
  const filterPortfolio = (searchParams.get("portfolio") as FilterPortfolio) || "all";
  const [showAddModal, setShowAddModal] = useState(false);

  // Build API URL — pass status only if not "all"; default excludes archived
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPortfolio !== "all") params.set("portfolio", filterPortfolio);
    const qs = params.toString();
    return `/api/projects${qs ? `?${qs}` : ""}`;
  }, [filterStatus, filterPortfolio]);

  const { data: projectsData, mutate: mutateProjects } = useSWR<Project[]>(apiUrl, fetcher, { revalidateOnFocus: false });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  // Tasks for progress bars — fetch all, compute per project_id client-side
  const { data: tasksData } = useSWR<Task[]>("/api/tasks", fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  const tasks: Task[] = Array.isArray(tasksData) ? tasksData : [];

  const progressMap = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    tasks.forEach(t => {
      if (!t.project_id) return;
      const cur = map.get(t.project_id) || { total: 0, done: 0 };
      cur.total++;
      if (t.status === "done") cur.done++;
      map.set(t.project_id, cur);
    });
    return map;
  }, [tasks]);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false } as Parameters<typeof router.push>[1]);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">פרויקטים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{projects.length} פרויקטים</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          פרויקט חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter("status", f.id)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterStatus === f.id
                  ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={filterPortfolio}
          onChange={(e) => setFilter("portfolio", e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-brand-400 outline-none"
        >
          {PORTFOLIO_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">אין פרויקטים</p>
          <p className="text-xs mt-1 opacity-70">לחץ "פרויקט חדש" כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const progress = progressMap.get(project.id) || { total: 0, done: 0 };
            const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
            const isDone = project.status === "done";
            const isOverdue = project.deadline && project.deadline < today && !isDone;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={clsx(
                  "bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all hover:shadow-md group",
                  isDone
                    ? "border-green-200 dark:border-green-800 opacity-70"
                    : "border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700"
                )}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", PRIORITY_COLORS[project.priority])}>
                      {project.priority.toUpperCase()}
                    </span>
                    {project.portfolio && (
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", PORTFOLIO_COLORS[project.portfolio])}>
                        {PORTFOLIO_LABELS[project.portfolio]}
                      </span>
                    )}
                  </div>
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", STATUS_COLORS[project.status])}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm dark:text-gray-100 mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {project.title}
                </h3>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                )}

                {/* Deadline */}
                {project.deadline && (
                  <p className={clsx("text-[10px] mb-2 font-medium", isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500")}>
                    {isOverdue ? "🔴 " : ""}{project.deadline}
                  </p>
                )}

                {/* Progress */}
                <div className="mt-auto pt-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                    <span>{progress.done}/{progress.total} משימות</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        pct === 100 ? "bg-green-500" : pct > 50 ? "bg-brand-500" : "bg-amber-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400 dark:text-gray-500">
                  <FolderKanban size={11} />
                  <span>{progress.total} משימות · לחץ לפרויקט</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <NewProjectModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => mutateProjects()}
        />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
      </div>
    }>
      <ProjectsPageContent />
    </Suspense>
  );
}
