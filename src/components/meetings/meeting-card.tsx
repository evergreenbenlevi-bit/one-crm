"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { he } from "date-fns/locale";
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

interface MeetingCardProps {
  meeting: MeetingWithCustomer;
}

const typeConfig: Record<MeetingType, { label: string; color: string; bg: string }> = {
  onboarding: { label: "אונבורדינג", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  monthly_1on1: { label: "פגישה חודשית", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
  group_zoom: { label: "זום קבוצתי", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30" },
};

const statusConfig: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: "מתוכנן", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "הושלם", color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "בוטל", color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
  no_show: { label: "לא הגיע", color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export function MeetingCard({ meeting }: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false);

  const typeInfo = typeConfig[meeting.type];
  const statusInfo = statusConfig[meeting.status];
  const meetingDate = new Date(meeting.date);
  const timeStr = format(meetingDate, "HH:mm");
  const contactName = meeting.customers?.name || "ללא שם";

  const hasSummary = meeting.summary || meeting.transcript_url;

  return (
    <div
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden transition-shadow",
        hasSummary && "cursor-pointer hover:shadow-md"
      )}
      onClick={() => hasSummary && setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center gap-3">
        {/* Time */}
        <div className="flex flex-col items-center text-center min-w-[50px]">
          <Clock size={14} className="text-gray-300 dark:text-gray-600 mb-1" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{timeStr}</span>
        </div>

        {/* Type indicator */}
        <div className={clsx("w-1 h-10 rounded-full")} style={{
          backgroundColor: meeting.type === "onboarding" ? "var(--color-success)" :
            meeting.type === "monthly_1on1" ? "var(--color-warning)" :
            "#8b5cf6"
        }} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", typeInfo.bg, typeInfo.color)}>
              {typeInfo.label}
            </span>
            <span className={clsx("text-xs px-2 py-0.5 rounded-full", statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {contactName}
          </div>
        </div>

        {/* Expand arrow */}
        {hasSummary && (
          <div className="text-gray-300 dark:text-gray-600">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && hasSummary && (
        <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-700 pt-3 space-y-2">
          {meeting.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{meeting.summary}</p>
          )}
          {meeting.transcript_url && (
            <a
              href={meeting.transcript_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              צפה בתמליל
            </a>
          )}
        </div>
      )}
    </div>
  );
}
