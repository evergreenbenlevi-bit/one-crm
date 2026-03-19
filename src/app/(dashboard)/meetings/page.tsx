"use client";

import { useState, useEffect, useCallback } from "react";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Calendar, ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { MeetingAddModal } from "@/components/meetings/meeting-add-modal";
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
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";

export default function MeetingsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [meetings, setMeetings] = useState<MeetingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 0 });
  const isCurrentWeek = isThisWeek(baseDate, { weekStartsOn: 0 });

  const weekLabel = isCurrentWeek
    ? "השבוע"
    : `${format(weekStart, "d בMMM", { locale: he })} — ${format(weekEnd, "d בMMM", { locale: he })}`;

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      start: format(weekStart, "yyyy-MM-dd"),
      end: format(weekEnd, "yyyy-MM-dd"),
    });
    const res = await fetch(`/api/meetings?${params}`);
    const data = await res.json();
    setMeetings(Array.isArray(data) ? data : []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <Calendar size={20} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-gray-100">פגישות</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">{weekLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} /> הוסף פגישה
          </button>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronRight size={18} />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
            >
              היום
            </button>
          )}
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : (
        <MeetingsList meetings={meetings} weekStart={weekStart} />
      )}

      <MeetingAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchMeetings}
      />
    </div>
  );
}
