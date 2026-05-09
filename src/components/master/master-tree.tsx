"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, LayoutList } from "lucide-react";
import { clsx } from "clsx";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";

// ── Types ──────────────────────────────────────────────────────────────────

interface MasterTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase: string | null;
  project_id: string;
}

interface MasterPhase {
  name: string;
  tasks: MasterTask[];
}

interface MasterProject {
  id: string;
  title: string;
  status: string;
  priority: string;
  description: string | null;
  task_count: number;
  phases: MasterPhase[];
}

interface MasterData {
  parent: MasterProject & { children?: never };
  children: MasterProject[];
}

// ── Status configs ─────────────────────────────────────────────────────────

const PROJECT_STATUS_CYCLE: Record<string, string> = {
  active: "paused", paused: "done", done: "active",
};

const TASK_STATUS_CYCLE: Record<string, string> = {
  open: "in_progress", in_progress: "done", done: "open", waiting: "done",
};

const PROJECT_STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  done: "bg-gray-500",
  archived: "bg-slate-700",
};

const TASK_STATUS_DOT: Record<string, string> = {
  open: "bg-gray-500",
  in_progress: "bg-blue-500",
  waiting: "bg-amber-500",
  done: "bg-emerald-500",
};

const PRIORITY_BADGE: Record<string, string> = {
  p0: "text-red-400",
  p1: "text-orange-400",
  p2: "text-blue-400",
  p3: "text-gray-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusDot({ status, type, onClick }: {
  status: string;
  type: "project" | "task";
  onClick: () => void;
}) {
  const dotCls = type === "project" ? PROJECT_STATUS_DOT : TASK_STATUS_DOT;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${status} — click to cycle`}
      className={clsx(
        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-70 cursor-pointer",
        dotCls[status] ?? "bg-gray-600"
      )}
    />
  );
}

function PriorityLabel({ priority }: { priority: string }) {
  return (
    <span className={clsx("text-[10px] font-mono uppercase", PRIORITY_BADGE[priority] ?? "text-gray-500")}>
      {priority}
    </span>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────

function TaskRow({ task, onStatusChange }: {
  task: MasterTask;
  onStatusChange: (id: string, status: string, type: "task") => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800/50 group min-w-0">
      <StatusDot
        status={task.status}
        type="task"
        onClick={() => onStatusChange(task.id, TASK_STATUS_CYCLE[task.status] ?? "open", "task")}
      />
      <span className={clsx(
        "text-sm flex-1 min-w-0 truncate",
        task.status === "done" ? "line-through text-gray-600" : "text-gray-300"
      )}>
        {task.title}
      </span>
      <PriorityLabel priority={task.priority} />
    </div>
  );
}

// ── Phase section ─────────────────────────────────────────────────────────

function PhaseSection({ phase, onStatusChange, defaultOpen }: {
  phase: MasterPhase;
  onStatusChange: (id: string, status: string, type: "task") => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = phase.tasks.filter((t) => t.status === "done").length;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-0.5 px-2 rounded hover:bg-gray-800/40 group"
      >
        {open ? (
          <ChevronDown size={12} className="text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
        )}
        <span className="text-xs text-gray-500 font-medium truncate">{phase.name}</span>
        <span className="text-[10px] text-gray-700 ml-1 flex-shrink-0">
          {doneCount}/{phase.tasks.length}
        </span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5">
          {phase.tasks.map((task) => (
            <TaskRow key={task.id} task={task} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Child project row ─────────────────────────────────────────────────────

function ChildProjectRow({ project, onStatusChange, defaultOpen }: {
  project: MasterProject;
  onStatusChange: (id: string, status: string, type: "project" | "task") => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const allTasks = project.phases.flatMap((p) => p.tasks);
  const doneCount = allTasks.filter((t) => t.status === "done").length;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-gray-800/60 group"
      >
        <StatusDot
          status={project.status}
          type="project"
          onClick={() => onStatusChange(project.id, PROJECT_STATUS_CYCLE[project.status] ?? "active", "project")}
        />
        {open ? (
          <ChevronDown size={13} className="text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-600 flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-gray-200 flex-1 min-w-0 truncate">
          {project.title}
        </span>
        {project.task_count > 0 && (
          <span className="text-[10px] text-gray-600 flex-shrink-0">
            {doneCount}/{project.task_count}
          </span>
        )}
        <PriorityLabel priority={project.priority} />
      </button>

      {open && project.phases.length > 0 && (
        <div className="ml-4 mt-0.5 border-l border-gray-800 pl-2">
          {project.phases.map((phase) => (
            <PhaseSection
              key={phase.name}
              phase={phase}
              onStatusChange={(id, status, type) => onStatusChange(id, status, type)}
              defaultOpen={phase.name.startsWith("P1")}
            />
          ))}
        </div>
      )}

      {open && project.task_count === 0 && (
        <div className="ml-6 py-1 text-xs text-gray-700 italic">אין משימות</div>
      )}
    </div>
  );
}

// ── Main tree ─────────────────────────────────────────────────────────────

export function MasterTree() {
  const { data, error, isLoading } = useSWR<MasterData>("/api/master", fetcher, {
    revalidateOnFocus: false,
  });

  const [parentOpen, setParentOpen] = useState(true);

  const handleStatusChange = useCallback(async (
    id: string,
    status: string,
    type: "project" | "task"
  ) => {
    await fetch("/api/master", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, status }),
    });
    mutate("/api/master");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
        טוען...
      </div>
    );
  }

  if (error || !data) {
    const msg = error?.message ?? "שגיאה בטעינה";
    const isSeed = msg.includes("seed");
    return (
      <div className="py-8 text-center space-y-2">
        <p className="text-red-400 text-sm">{msg}</p>
        {isSeed && (
          <p className="text-gray-600 text-xs font-mono">
            npx tsx scripts/seed-master-plan.ts
          </p>
        )}
      </div>
    );
  }

  const { parent, children } = data;
  const allTasks = [
    ...parent.phases.flatMap((p) => p.tasks),
    ...children.flatMap((c) => c.phases.flatMap((p) => p.tasks)),
  ];
  const totalDone = allTasks.filter((t) => t.status === "done").length;

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-800 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
        <LayoutList size={16} className="text-gray-500" />
        <span className="text-sm font-mono text-gray-400 uppercase tracking-wide">
          Master Plan
        </span>
        <span className="ml-auto text-xs text-gray-700">
          {totalDone}/{allTasks.length} done
        </span>
      </div>

      {/* Parent project */}
      <button
        onClick={() => setParentOpen(!parentOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-gray-800/60"
      >
        <StatusDot
          status={parent.status}
          type="project"
          onClick={() => handleStatusChange(parent.id, PROJECT_STATUS_CYCLE[parent.status] ?? "active", "project")}
        />
        {parentOpen ? (
          <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
        )}
        <span className="text-base font-bold text-white flex-1 min-w-0 truncate">
          {parent.title}
        </span>
        <PriorityLabel priority={parent.priority} />
      </button>

      {parentOpen && (
        <div className="ml-4 mt-1 border-l border-gray-800 pl-2">
          {children.map((child, i) => (
            <ChildProjectRow
              key={child.id}
              project={child}
              onStatusChange={handleStatusChange}
              defaultOpen={i === 0}
            />
          ))}

          {/* Parent-level tasks (if any) */}
          {parent.phases.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-800/50">
              {parent.phases.map((phase) => (
                <PhaseSection
                  key={phase.name}
                  phase={phase}
                  onStatusChange={handleStatusChange}
                  defaultOpen
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
