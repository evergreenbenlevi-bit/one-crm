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
  sales_call: { label: "שיחת מכירה", color: "text-brand-600", bg: "bg-brand-50" },
  onboarding: { label: "אונבורדינג", color: "text-emerald-700", bg: "bg-emerald-50" },
  monthly_1on1: { label: "פגישה חודשית", color: "text-amber-700", bg: "bg-amber-50" },
  group_zoom: { label: "זום קבוצתי", color: "text-violet-700", bg: "bg-violet-50" },
};

const statusConfig: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: "מתוכנן", color: "bg-blue-50 text-blue-700" },
  completed: { label: "הושלם", color: "bg-green-50 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-gray-100 text-gray-500" },
  no_show: { label: "לא הגיע", color: "bg-red-50 text-red-700" },
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
        "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow",
        hasSummary && "cursor-pointer hover:shadow-md"
      )}
      onClick={() => hasSummary && setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center gap-3">
        {/* Time */}
        <div className="flex flex-col items-center text-center min-w-[50px]">
          <Clock size={14} className="text-gray-300 mb-1" />
          <span className="text-sm font-bold text-gray-800">{timeStr}</span>
        </div>

        {/* Type indicator */}
        <div className={clsx("w-1 h-10 rounded-full", typeInfo.bg.replace("bg-", "bg-").replace("50", "400"))} style={{
          backgroundColor: meeting.type === "sales_call" ? "var(--color-brand-500)" :
            meeting.type === "onboarding" ? "var(--color-success)" :
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
          <div className="mt-1 text-sm font-medium text-gray-800 truncate">
            {contactName}
          </div>
        </div>

        {/* Expand arrow */}
        {hasSummary && (
          <div className="text-gray-300">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && hasSummary && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
          {meeting.summary && (
            <p className="text-sm text-gray-600 leading-relaxed">{meeting.summary}</p>
          )}
          {meeting.transcript_url && (
            <a
              href={meeting.transcript_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
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
