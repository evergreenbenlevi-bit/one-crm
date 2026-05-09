"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import type { Task } from "@/lib/types/tasks";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_CAPACITY = {
  morning: 300,
  afternoon: 300,
  evening: 120,
} as const;

type Slot = keyof typeof SLOT_CAPACITY;

const SLOT_LABELS: Record<Slot, string> = {
  morning: "בוקר",
  afternoon: "צהריים",
  evening: "ערב",
};

const DAY_NAMES_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SlotData {
  committed: number;
  capacity: number;
  pct: number;
  overloaded: boolean;
  color: "green" | "amber" | "red";
}

interface DayData {
  date: string;
  dateObj: Date;
  isToday: boolean;
  dayOfWeek: number;
  slots: Record<Slot, SlotData>;
  isEmpty: boolean;
  anyOverloaded: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBarColor(pct: number): "green" | "amber" | "red" {
  if (pct >= 100) return "red";
  if (pct >= 70) return "amber";
  return "green";
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

// ─── Bar Component ────────────────────────────────────────────────────────────

function CapacityBar({ slot, data }: { slot: Slot; data: SlotData }) {
  const barBg = {
    green: "bg-[#10B981]/30",
    amber: "bg-[#F59E0B]/35",
    red: "bg-[#EF4444]/35",
  }[data.color];

  const barFill = {
    green: "bg-[#10B981]",
    amber: "bg-[#F59E0B]",
    red: "bg-[#EF4444]",
  }[data.color];

  return (
    <div className="mb-[5px] last:mb-0">
      <div className="flex justify-between items-center mb-[3px]">
        <span className="text-[9px] text-[#6B7280]">{SLOT_LABELS[slot]}</span>
        <span
          className={clsx(
            "text-[9px] tabular-nums",
            data.overloaded ? "text-[#EF4444] font-bold" : "text-[#4B5563]"
          )}
        >
          {data.committed > 0 ? fmtMin(data.committed) : "—"}
        </span>
      </div>
      <div className="h-[6px] rounded-[3px] bg-[#1F2937] overflow-hidden relative">
        <div
          className={clsx(
            "h-full rounded-[3px] transition-all duration-300",
            barFill,
            data.overloaded && "animate-pulse"
          )}
          style={{ width: `${Math.min(100, data.pct)}%` }}
        />
        {/* Background tint for non-empty */}
        {data.committed > 0 && (
          <div
            className={clsx("absolute inset-0 rounded-[3px]", barBg)}
            style={{ width: `${Math.min(100, data.pct)}%`, mixBlendMode: "overlay" }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({ day }: { day: DayData }) {
  const slots: Slot[] = ["morning", "afternoon", "evening"];

  return (
    <div
      className={clsx(
        "flex-shrink-0 w-[120px] rounded-xl border px-3 py-2.5",
        day.isToday
          ? "border-l-2 border-l-[#F59E0B] border-[#2A2A2A] bg-[#141414]"
          : "border-[#1F1F1F] bg-[#141414]"
      )}
      style={day.isToday ? { background: "rgba(245,158,11,0.03)" } : undefined}
    >
      {/* Header */}
      <div className="mb-2">
        <div
          className={clsx(
            "text-[10px] font-bold leading-tight",
            day.isToday ? "text-[#F59E0B]" : "text-[#9CA3AF]"
          )}
        >
          {DAY_NAMES_HE[day.dayOfWeek]}
        </div>
        <div className="text-[9px] text-[#4B5563] leading-tight">
          {DAY_NAMES_EN[day.dayOfWeek]}
        </div>
        <div className="text-[9px] text-[#4B5563] mt-0.5">
          {day.dateObj.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}
        </div>
      </div>

      {/* Slot bars */}
      <div>
        {slots.map((slot) => (
          <CapacityBar key={slot} slot={slot} data={day.slots[slot]} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1.5 border-t border-[#1F1F1F]">
        {day.isEmpty ? (
          <span className="text-[9px] text-[#4B5563] font-medium">פנוי</span>
        ) : day.anyOverloaded ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded-full">
            עומס
          </span>
        ) : (
          <span className="text-[9px] text-[#6B7280]">
            {Math.round(
              (Object.values(day.slots) as SlotData[]).reduce(
                (sum, s) => sum + s.pct,
                0
              ) / 3
            )}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WeeklyCapacityViewProps {
  tasks: Task[];
}

export function WeeklyCapacityView({ tasks }: WeeklyCapacityViewProps) {
  const [expanded, setExpanded] = useState(false);

  const days = useMemo<DayData[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const isToday = i === 0;
      const dayOfWeek = d.getDay();

      const dayTasks = tasks.filter(
        (t) =>
          t.due_date === dateStr &&
          t.status !== "done" &&
          !t.archived_at &&
          t.estimated_minutes
      );

      // Tasks with no slot or "any" get distributed to morning
      const anyMin = dayTasks
        .filter((t) => !t.time_slot || t.time_slot === "any")
        .reduce((s, t) => s + (t.estimated_minutes || 0), 0);

      const buildSlot = (slot: Slot): SlotData => {
        const slotMin =
          dayTasks
            .filter((t) => t.time_slot === slot)
            .reduce((s, t) => s + (t.estimated_minutes || 0), 0) +
          (slot === "morning" ? anyMin : 0); // assign unslotted to morning

        const cap = SLOT_CAPACITY[slot];
        const pct = cap > 0 ? Math.round((slotMin / cap) * 100) : 0;
        const color = getBarColor(pct);

        return {
          committed: slotMin,
          capacity: cap,
          pct,
          overloaded: pct >= 100,
          color,
        };
      };

      const slots: Record<Slot, SlotData> = {
        morning: buildSlot("morning"),
        afternoon: buildSlot("afternoon"),
        evening: buildSlot("evening"),
      };

      const totalCommitted = Object.values(slots).reduce(
        (s, sd) => s + sd.committed,
        0
      );

      return {
        date: dateStr,
        dateObj: d,
        isToday,
        dayOfWeek,
        slots,
        isEmpty: totalCommitted === 0,
        anyOverloaded: Object.values(slots).some((s) => s.overloaded),
      };
    });
  }, [tasks]);

  // Summary stats for collapsed view
  const summaryStats = useMemo(() => {
    const overloadedDays = days.filter((d) => d.anyOverloaded).length;
    const busyDays = days.filter((d) => !d.isEmpty).length;
    const avgLoad = Math.round(
      days.reduce((sum, d) => {
        const slotPcts = (Object.values(d.slots) as SlotData[]).map((s) => s.pct);
        return sum + slotPcts.reduce((a, b) => a + b, 0) / 3;
      }, 0) / 7
    );
    return { overloadedDays, busyDays, avgLoad };
  }, [days]);

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#1F1F1F] overflow-hidden">
      {/* Compact toggle header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="weekly-capacity-grid"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#141414] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#9CA3AF]">שבוע</span>
          {/* Mini summary chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#6B7280]">
              {summaryStats.busyDays}/7 ימים פעילים
            </span>
            {summaryStats.overloadedDays > 0 && (
              <span className="text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded-full">
                {summaryStats.overloadedDays} עומס
              </span>
            )}
            <span className="text-[10px] text-[#4B5563]">
              {summaryStats.avgLoad}% ממוצע
            </span>
          </div>
        </div>
        <div className="text-[#4B5563]">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded 7-day grid */}
      {expanded && (
        <div id="weekly-capacity-grid" className="border-t border-[#1F1F1F] px-4 pb-4 pt-3">
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              {days.map((day) => (
                <DayColumn key={day.date} day={day} />
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#1F1F1F]">
            {[
              { color: "#10B981", label: "פנוי (<70%)" },
              { color: "#F59E0B", label: "עמוס (70-99%)" },
              { color: "#EF4444", label: "עומס יתר (≥100%)" },
            ].map(({ color, label }) => (
              <div key={color} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] text-[#4B5563]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
