"use client";

import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Lead } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface LeadsTableProps {
  leads: Lead[];
}

const sourceLabels: Record<string, string> = {
  campaign: "קמפיין",
  organic: "אורגני",
  youtube: "יוטיוב",
  referral: "הפנייה",
  other: "אחר",
};

export function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
        אין לידים להצגה
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">שם</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">סטטוס</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">מקור</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">מודעה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">תאריך</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400">
                    {lead.name}
                  </Link>
                  {lead.email && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.current_status} />
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400">
                  {sourceLabels[lead.source] || lead.source}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                  {lead.ad_name || "\u2014"}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-400 dark:text-gray-500 text-xs">
                  {formatDistanceToNow(new Date(lead.created_at), { locale: he, addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400">
                        <Phone size={14} />
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`} target="_blank" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-success">
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
