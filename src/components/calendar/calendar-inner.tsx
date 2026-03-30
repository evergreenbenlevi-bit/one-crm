"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { he } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { Task } from "@/lib/types/tasks";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { clsx } from "clsx";

const locales = { he };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

export default function CalendarInner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const data: Task[] = await res.json();
      setTasks(data.filter(t => t.due_date && t.status !== "done"));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const events: CalendarEvent[] = tasks.map(task => {
    const d = new Date(task.due_date!);
    return {
      id: task.id,
      title: task.title,
      start: d,
      end: d,
      resource: task,
    };
  });

  function eventStyleGetter(event: CalendarEvent) {
    const p = event.resource.priority;
    const colorMap: Record<string, string> = {
      p1: "#ef4444",
      p2: "#f59e0b",
      p3: "#6b7280",
    };
    return {
      style: {
        backgroundColor: colorMap[p] || "#6b7280",
        borderRadius: "6px",
        border: "none",
        color: "white",
        fontSize: "11px",
        padding: "2px 6px",
      }
    };
  }

  async function handleSave(updatedTask: Task) {
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch {
      // silent
    }
    setEditTask(null);
  }

  async function handleDelete(taskId: string) {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      // silent
    }
    setEditTask(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">לוח שנה</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tasks.length} משימות עם דדליין
          </p>
        </div>
        <div className="flex gap-2">
          {([Views.MONTH, Views.WEEK, Views.AGENDA] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === v
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
            >
              {v === Views.MONTH ? "חודש" : v === Views.WEEK ? "שבוע" : "רשימה"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />P1 — מזיז מחט</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />P2 — חשוב</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" />P3</span>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4" style={{ height: 640 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => setEditTask(event.resource)}
          culture="he"
          messages={{
            month: "חודש",
            week: "שבוע",
            day: "יום",
            agenda: "רשימה",
            today: "היום",
            previous: "‹",
            next: "›",
            noEventsInRange: "אין משימות בטווח זה",
            showMore: (count) => `+${count} עוד`,
          }}
          rtl
        />
      </div>

      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
