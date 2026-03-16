"use client";

import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, addDays, isToday, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { MeetingCard } from "./meeting-card";
import type { MeetingType, MeetingStatus } from "@/lib/types/database";

interface MeetingWithCustomer {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  date: string;
  type: MeetingType;
  summary: string | null;
  transcript_url: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  customers: { name: string; email: string | null } | null;
}

interface MeetingsListProps {
  meetings: MeetingWithCustomer[];
}

export function MeetingsList({ meetings }: MeetingsListProps) {
  // Generate days for current week (Sunday to Saturday for Hebrew locale)
  const weekDays = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, []);

  // Group meetings by day
  const groupedMeetings = useMemo(() => {
    const groups = new Map<string, MeetingWithCustomer[]>();

    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd");
      groups.set(key, []);
    }

    for (const meeting of meetings) {
      const meetingDate = new Date(meeting.date);
      const key = format(meetingDate, "yyyy-MM-dd");
      const existing = groups.get(key);
      if (existing) {
        existing.push(meeting);
      }
    }

    // Sort meetings within each day by time
    for (const [, dayMeetings] of groups) {
      dayMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return groups;
  }, [meetings, weekDays]);

  if (meetings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
        אין פגישות השבוע
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {weekDays.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayMeetings = groupedMeetings.get(key) || [];
        const today = isToday(day);
        const dayLabel = format(day, "EEEE, d בMMMM", { locale: he });

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-sm font-medium ${today ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
                {today ? `היום — ${dayLabel}` : dayLabel}
              </h3>
              {dayMeetings.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {dayMeetings.length}
                </span>
              )}
            </div>

            {dayMeetings.length > 0 ? (
              <div className="space-y-2">
                {dayMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center text-xs text-gray-300 dark:text-gray-600">
                אין פגישות
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
