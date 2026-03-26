"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Film, Youtube, Sparkles } from "lucide-react";
import { clsx } from "clsx";

interface ContentIdea {
  id: string;
  title: string;
  type: "short_form" | "long_form" | "inspiration";
  status: string;
  platform: string | null;
  scheduled_date: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-yellow-400",
  working: "bg-blue-400",
  scripted: "bg-purple-400",
  filmed: "bg-indigo-400",
  published: "bg-green-400",
  parked: "bg-gray-300 dark:bg-gray-600",
};

const TYPE_ICONS = {
  short_form: Film,
  long_form: Youtube,
  inspiration: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  short_form: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  long_form: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  inspiration: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const TYPE_LABELS: Record<string, string> = {
  short_form: "Short Form",
  long_form: "Long Form",
  inspiration: "השראה",
};

const STATUS_LABELS: Record<string, string> = {
  idea: "רעיון",
  working: "בתהליך",
  scripted: "סקריפט",
  filmed: "צולם",
  published: "פורסם",
  parked: "לא עכשיו",
};

const HEBREW_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun, adjust for RTL (Sun=0)
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ContentCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/content-ideas?type=all");
    if (res.ok) setIdeas(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group ideas by scheduled_date
  const byDate: Record<string, ContentIdea[]> = {};
  const unscheduled: ContentIdea[] = [];

  const filtered = typeFilter === "all" ? ideas : ideas.filter(i => i.type === typeFilter);

  for (const idea of filtered) {
    if (idea.scheduled_date) {
      // Only show in this month's calendar
      const d = idea.scheduled_date.substring(0, 7); // "YYYY-MM"
      const thisMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (d === thisMonth) {
        (byDate[idea.scheduled_date] ??= []).push(idea);
      }
    } else {
      unscheduled.push(idea);
    }
  }

  const selectedIdeas = selectedDay ? (byDate[selectedDay] || []) : [];

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const activeStatuses = ["idea", "working", "scripted", "filmed"];
  const pipeline = filtered.filter(i => activeStatuses.includes(i.status));
  const published = filtered.filter(i => i.status === "published");

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold">לוח תוכן</h1>
        </div>

        {/* Type Filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {[
            { key: "all", label: "הכל" },
            { key: "short_form", label: "Short Form" },
            { key: "long_form", label: "Long Form" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                typeFilter === key
                  ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "בצנרת", count: pipeline.length, color: "text-blue-600" },
            { label: "פורסמו החודש", count: published.length, color: "text-green-600" },
            { label: "ללא תאריך", count: unscheduled.length, color: "text-yellow-600" },
            { label: "מתוזמנים", count: Object.values(byDate).flat().length, color: "text-indigo-600" },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className={clsx("text-2xl font-bold", color)}>{count}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <h2 className="text-lg font-semibold">
              {HEBREW_MONTHS[month]} {year}
            </h2>
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {HEBREW_DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-gray-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for first day offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateKey = formatDateKey(year, month, day);
              const dayIdeas = byDate[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDay(isSelected ? null : dateKey)
                  }
                  className={clsx(
                    "relative min-h-[64px] p-1.5 rounded-lg text-right transition-colors border",
                    isSelected
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  <span
                    className={clsx(
                      "text-xs font-medium inline-block w-5 h-5 rounded-full flex items-center justify-center mb-1",
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayIdeas.slice(0, 4).map((idea) => (
                      <span
                        key={idea.id}
                        className={clsx(
                          "block w-2 h-2 rounded-full",
                          STATUS_COLORS[idea.status]
                        )}
                        title={idea.title}
                      />
                    ))}
                    {dayIdeas.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{dayIdeas.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={clsx("w-2.5 h-2.5 rounded-full", STATUS_COLORS[key])} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Day Details */}
          {selectedDay && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
              <h3 className="font-semibold text-sm mb-3 text-indigo-600 dark:text-indigo-400">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("he-IL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              {selectedIdeas.length === 0 ? (
                <p className="text-sm text-gray-400">אין תוכן מתוזמן ליום זה</p>
              ) : (
                <div className="space-y-2">
                  {selectedIdeas.map((idea) => {
                    const Icon = TYPE_ICONS[idea.type];
                    return (
                      <div
                        key={idea.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                      >
                        <Icon size={14} className="mt-0.5 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{idea.title}</p>
                          <span
                            className={clsx(
                              "text-xs px-1.5 py-0.5 rounded-full",
                              STATUS_COLORS[idea.status]
                                .replace("bg-", "bg-opacity-20 text-")
                                .split(" ")[0],
                              "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                            )}
                          >
                            {STATUS_LABELS[idea.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Unscheduled */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                ללא תאריך
              </h3>
              <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                {unscheduled.length}
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : unscheduled.length === 0 ? (
              <p className="text-sm text-gray-400">הכל מתוזמן ✓</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {unscheduled.slice(0, 20).map((idea) => {
                  const Icon = TYPE_ICONS[idea.type];
                  return (
                    <div
                      key={idea.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span
                        className={clsx(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          STATUS_COLORS[idea.status]
                        )}
                      />
                      <Icon size={12} className="text-gray-400 shrink-0" />
                      <span className="text-sm truncate">{idea.title}</span>
                    </div>
                  );
                })}
                {unscheduled.length > 20 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{unscheduled.length - 20} נוספים
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Note about scheduled_date */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              💡 כדי לתזמן תוכן לתאריכים, יש להוסיף שדה{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                scheduled_date
              </code>{" "}
              לטבלת <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">content_ideas</code>{" "}
              בSupabase (type: date, nullable).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
