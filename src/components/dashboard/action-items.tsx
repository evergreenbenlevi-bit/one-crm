import { Phone, MessageCircle, Clock, Calendar, AlertTriangle } from "lucide-react";
import type { Lead, Customer, Meeting } from "@/lib/types/database";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface ActionItemsProps {
  hotLeads: Lead[];
  upcomingMeetings: Array<Meeting & { customers?: { name: string } | null }>;
  endingPrograms: Customer[];
}

const statusLabels: Record<string, string> = {
  new: "ליד חדש",
  consumed_content: "צרך תוכן",
  engaged: "ביצע אינטראקציה",
  applied: "הגיש בקשה",
};

export function ActionItems({ hotLeads, upcomingMeetings, endingPrograms }: ActionItemsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 dark:text-gray-100">
        <AlertTriangle size={20} className="text-warning" />
        דורש טיפול
      </h2>

      {hotLeads.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">🔥 לידים חמים</h3>
          <div className="space-y-3">
            {hotLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400">{lead.name}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{statusLabels[lead.current_status] || lead.current_status}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(lead.updated_at), { locale: he, addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400">
                      <Phone size={16} />
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`} target="_blank" className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-success">
                      <MessageCircle size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMeetings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">📅 פגישות קרובות</h3>
          <div className="space-y-3">
            {upcomingMeetings.map(meeting => (
              <Link key={meeting.id} href="/meetings" className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 rounded-lg px-1 -mx-1 transition-colors">
                <div>
                  <span className="text-sm font-medium dark:text-gray-200">{meeting.customers?.name || "—"}</span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar size={12} />
                    <span>{new Date(meeting.date).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span>{new Date(meeting.date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {endingPrograms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">⏰ מסיימים תוכנית בקרוב</h3>
          <div className="space-y-3">
            {endingPrograms.map(customer => (
              <div key={customer.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <Link href={`/customers/${customer.id}`} className="text-sm font-medium hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400">{customer.name}</Link>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <Clock size={12} />
                  <span>סיום: {customer.program_end_date ? new Date(customer.program_end_date).toLocaleDateString("he-IL") : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hotLeads.length === 0 && upcomingMeetings.length === 0 && endingPrograms.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500 text-sm">
          אין פעולות דחופות כרגע 👍
        </div>
      )}
    </div>
  );
}
