"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { ContentPiece } from "./types";
import { STATUS_DOT, STATUS_LABELS } from "./types";

interface ContentCalendarProps {
  pieces: ContentPiece[];
  onEdit: (piece: ContentPiece) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ContentCalendar({ pieces, onEdit }: ContentCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Build date maps
  const filmMap: Record<string, ContentPiece[]> = {};
  const publishMap: Record<string, ContentPiece[]> = {};
  const thisMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  for (const piece of pieces) {
    if (piece.film_date?.startsWith(thisMonthStr)) {
      (filmMap[piece.film_date] ??= []).push(piece);
    }
    if (piece.publish_date?.startsWith(thisMonthStr)) {
      (publishMap[piece.publish_date] ??= []).push(piece);
    }
  }

  const selectedFilm = selectedDay ? (filmMap[selectedDay] ?? []) : [];
  const selectedPublish = selectedDay ? (publishMap[selectedDay] ?? []) : [];
  const selectedAll = [...selectedFilm, ...selectedPublish];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-gray-100">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const dateKey = formatDateKey(year, month, day);
            const filmItems = filmMap[dateKey] ?? [];
            const publishItems = publishMap[dateKey] ?? [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDay;
            const hasItems = filmItems.length > 0 || publishItems.length > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={clsx(
                  "relative min-h-[56px] p-1.5 rounded-lg text-left transition-colors border",
                  isSelected
                    ? "border-gray-500 bg-gray-800"
                    : hasItems
                    ? "border-gray-800 hover:border-gray-600 hover:bg-gray-850"
                    : "border-transparent hover:bg-gray-800/50"
                )}
              >
                <span
                  className={clsx(
                    "text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full mb-1",
                    isToday ? "bg-white text-gray-950" : "text-gray-500"
                  )}
                >
                  {day}
                </span>

                <div className="space-y-0.5">
                  {filmItems.slice(0, 2).map((p) => (
                    <div key={`f-${p.id}`} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-[9px] text-gray-400 truncate">{p.title}</span>
                    </div>
                  ))}
                  {publishItems.slice(0, 2).map((p) => (
                    <div key={`pub-${p.id}`} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] text-gray-400 truncate">{p.title}</span>
                    </div>
                  ))}
                  {filmItems.length + publishItems.length > 4 && (
                    <span className="text-[9px] text-gray-600">
                      +{filmItems.length + publishItems.length - 4}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">Film date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500">Publish date</span>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        {selectedDay ? (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            {selectedAll.length === 0 ? (
              <p className="text-sm text-gray-600">No content scheduled</p>
            ) : (
              <div className="space-y-2">
                {selectedFilm.length > 0 && (
                  <>
                    <p className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-1">
                      Film
                    </p>
                    {selectedFilm.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onEdit(p)}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
                      >
                        <span className={clsx("w-2 h-2 rounded-full mt-1 flex-shrink-0", STATUS_DOT[p.status])} />
                        <div>
                          <p className="text-xs font-medium text-gray-200">{p.title}</p>
                          <p className="text-[10px] text-gray-500">{STATUS_LABELS[p.status]}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {selectedPublish.length > 0 && (
                  <>
                    <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide mb-1 mt-3">
                      Publish
                    </p>
                    {selectedPublish.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onEdit(p)}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
                      >
                        <span className={clsx("w-2 h-2 rounded-full mt-1 flex-shrink-0", STATUS_DOT[p.status])} />
                        <div>
                          <p className="text-xs font-medium text-gray-200">{p.title}</p>
                          <p className="text-[10px] text-gray-500">{STATUS_LABELS[p.status]}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-sm text-gray-600">Click a day to see scheduled content</p>
          </div>
        )}

        {/* This month summary */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            This Month
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Film dates set</span>
              <span className="text-sm font-semibold text-blue-400">
                {Object.values(filmMap).flat().length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Publish dates set</span>
              <span className="text-sm font-semibold text-emerald-400">
                {Object.values(publishMap).flat().length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
