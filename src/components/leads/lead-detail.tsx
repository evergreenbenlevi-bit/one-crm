"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
  Megaphone,
  Calendar,
  UserCheck,
  Eye,
  Send,
  FileText,
  ShoppingCart,
  ClipboardList,
  UserPlus,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { LeadEditModal } from "./lead-edit-modal";
import type { Lead, FunnelEvent, Note, Customer, FunnelEventType, ProgramType } from "@/lib/types/database";

// ──────────────────────────────────────────
// Labels & config
// ──────────────────────────────────────────

const productLabels: Record<ProgramType, string> = {
  one_core: "ONE™ Core",
  one_vip: "ONE™ VIP",
};

const statusLabels: Record<string, string> = {
  new: "חדש",
  consumed_content: "צרך תוכן",
  engaged: "ביצע אינטראקציה",
  applied: "הגיש בקשה",
  qualified: "מתאים",
  onboarding: "בתהליך קליטה",
  active_client: "לקוח פעיל",
  completed: "סיים תוכנית",
  lost: "אבוד",
};

const statusColors: Record<string, string> = {
  new: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  consumed_content: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  engaged: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  applied: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  qualified: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  onboarding: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  active_client: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const eventLabels: Record<FunnelEventType, string> = {
  registered: "נרשם",
  consumed_content: "צרך תוכן",
  engaged: "ביצע אינטראקציה",
  applied: "הגיש בקשה",
  qualified: "מתאים",
  purchased: "רכש",
};

const eventIcons: Record<FunnelEventType, typeof UserPlus> = {
  registered: UserPlus,
  consumed_content: Eye,
  engaged: Send,
  applied: ClipboardList,
  qualified: MessageSquare,
  purchased: ShoppingCart,
};

const sourceLabels: Record<string, string> = {
  campaign: "קמפיין",
  organic: "אורגני",
  youtube: "יוטיוב",
  referral: "הפניה",
  other: "אחר",
};

// Funnel definitions
const oneVipFunnel: FunnelEventType[] = [
  "registered",
  "consumed_content",
  "engaged",
  "applied",
  "qualified",
  "purchased",
];

const oneCoreFunnel: FunnelEventType[] = ["registered", "purchased"];

const funnelStepLabels: Record<FunnelEventType, string> = {
  registered: "נרשם",
  consumed_content: "תוכן",
  engaged: "אינטראקציה",
  applied: "בקשה",
  qualified: "מתאים",
  purchased: "רכש",
};

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface LeadWithRelations extends Lead {
  events: FunnelEvent[];
  notes: Note[];
  customer: Customer | null;
}

interface LeadDetailProps {
  lead: LeadWithRelations;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(lead.notes);
  const [noteContent, setNoteContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const funnelSteps =
    lead.program === "one_vip" ? oneVipFunnel : oneCoreFunnel;

  const completedEventTypes = new Set(lead.events.map((e) => e.event_type));

  // ── Add note ──
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          content: noteContent.trim(),
          author: "בן",
        }),
      });
      if (res.ok) {
        const newNote: Note = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        setNoteContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Format date ──
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  }

  function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    })} ${d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <div className="space-y-6">
      {/* ── Back button ── */}
      <button
        onClick={() => router.push("/leads")}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowRight size={16} />
        חזרה ללידים
      </button>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Right column (main content) ── */}
        <div className="flex-1 space-y-6">
          {/* ── Header card ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xl">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold dark:text-gray-100">{lead.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full font-medium">
                      {productLabels[lead.program]}
                    </span>
                    <span
                      className={clsx(
                        "text-xs px-3 py-1 rounded-full font-medium",
                        statusColors[lead.current_status] || "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {statusLabels[lead.current_status] || lead.current_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                >
                  <Pencil size={16} /> עריכה
                </button>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors"
                  >
                    <Phone size={16} /> התקשר
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <MessageCircle size={16} /> וואטסאפ
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ── Contact info card ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">פרטי קשר</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">אימייל</div>
                    <div className="text-sm dark:text-gray-200">{lead.email}</div>
                  </div>
                </div>
              )}

              {lead.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                    <Phone size={16} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">טלפון</div>
                    <div className="text-sm dark:text-gray-200" dir="ltr">{lead.phone}</div>
                  </div>
                </div>
              )}

              {lead.occupation && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                    <Briefcase size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">תחום עיסוק</div>
                    <div className="text-sm dark:text-gray-200">{lead.occupation}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <Megaphone size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">מקור</div>
                  <div className="text-sm dark:text-gray-200">{sourceLabels[lead.source] || lead.source}</div>
                </div>
              </div>

              {lead.ad_name && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">מודעה</div>
                    <div className="text-sm dark:text-gray-200">{lead.ad_name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">תאריך הרשמה</div>
                  <div className="text-sm dark:text-gray-200">{formatDate(lead.created_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Funnel progress card ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-5">התקדמות במשפך</h2>
            <div className="flex items-center justify-between">
              {funnelSteps.map((step, i) => {
                const completed = completedEventTypes.has(step);
                const isLast = i === funnelSteps.length - 1;

                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    {/* Step dot + label */}
                    <div className="flex flex-col items-center">
                      <div
                        className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                          completed
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        )}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={clsx(
                          "text-[11px] mt-1.5 whitespace-nowrap",
                          completed ? "text-brand-600 dark:text-brand-400 font-medium" : "text-gray-400 dark:text-gray-500"
                        )}
                      >
                        {funnelStepLabels[step]}
                      </span>
                    </div>

                    {/* Connecting line */}
                    {!isLast && (
                      <div className="flex-1 mx-1">
                        <div
                          className={clsx(
                            "h-0.5 w-full",
                            completed && completedEventTypes.has(funnelSteps[i + 1])
                              ? "bg-brand-500"
                              : completed
                              ? "bg-brand-200 dark:bg-brand-700"
                              : "bg-gray-200 dark:bg-gray-600"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Notes section ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">הערות</h2>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="mb-5">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="הוסף הערה..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700 focus:border-brand-400 dark:focus:border-brand-500 resize-none transition-colors"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!noteContent.trim() || submitting}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "שומר..." : "שמור הערה"}
                </button>
              </div>
            </form>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">אין הערות עדיין</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl bg-gray-50 dark:bg-gray-700 px-4 py-3"
                  >
                    <p className="text-sm whitespace-pre-wrap dark:text-gray-200">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{note.author}</span>
                      <span>·</span>
                      <span>{formatDateTime(note.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Customer link card ── */}
          {lead.customer && (
            <Link
              href={`/customers/${lead.customer.id}`}
              className="block bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/60 transition-colors">
                  <UserCheck size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-green-800 dark:text-green-300">הפך ללקוח</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    לחץ לצפייה בכרטיס הלקוח
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Left column (timeline) ── */}
        <div className="lg:w-80 lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">ציר זמן</h3>

            {lead.events.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">אין אירועים</p>
            ) : (
              <div className="relative">
                <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-700" />
                <div className="space-y-4">
                  {[...lead.events]
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    )
                    .map((event) => {
                      const Icon = eventIcons[event.event_type] || UserPlus;
                      return (
                        <div key={event.id} className="flex gap-3 relative">
                          <div className="w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 z-10 ring-2 ring-white dark:ring-gray-800 bg-brand-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDateTime(event.timestamp)}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Icon size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium dark:text-gray-200">
                                {eventLabels[event.event_type] || event.event_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeadEditModal lead={lead} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
