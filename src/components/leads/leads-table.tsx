"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, Download, Trash2 } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { clsx } from "clsx";

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const sourceLabels: Record<string, string> = {
  campaign: "קמפיין",
  organic: "אורגני",
  youtube: "יוטיוב",
  referral: "הפנייה",
  instagram: "אינסטגרם",
  linkedin: "לינקדאין",
  content: "תוכן",
  webinar: "וובינר",
  skool: "Skool",
  other: "אחר",
};

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "חדש" },
  { value: "consumed_content", label: "צרך תוכן" },
  { value: "engaged", label: "ביצע אינטראקציה" },
  { value: "applied", label: "הגיש בקשה" },
  { value: "qualified", label: "מתאים" },
  { value: "onboarding", label: "בתהליך קליטה" },
  { value: "active_client", label: "לקוח פעיל" },
  { value: "completed", label: "סיים תוכנית" },
  { value: "lost", label: "אבוד" },
];

const statusColors: Record<string, string> = {
  new: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  consumed_content: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  engaged: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  applied: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  qualified: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  onboarding: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  active_client: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function exportCsv(leads: Lead[]) {
  const headers = ["שם", "אימייל", "טלפון", "סטטוס", "מקור", "מודעה", "תאריך"];
  const rows = leads.map(l => [
    l.name, l.email || "", l.phone || "", l.current_status,
    sourceLabels[l.source] || l.source, l.ad_name || "",
    new Date(l.created_at).toLocaleDateString("he-IL"),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({ leads, onStatusChange, onBulkDelete }: LeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | "">("");
  const [applyingBulk, setApplyingBulk] = useState(false);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map(l => l.id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function applyBulkStatus() {
    if (!bulkStatus || selected.size === 0 || !onStatusChange) return;
    setApplyingBulk(true);
    for (const id of selected) {
      await onStatusChange(id, bulkStatus);
    }
    setSelected(new Set());
    setBulkStatus("");
    setApplyingBulk(false);
  }

  function handleBulkDelete() {
    if (!onBulkDelete || selected.size === 0) return;
    if (!confirm(`למחוק ${selected.size} לידים? פעולה בלתי הפיכה.`)) return;
    onBulkDelete(Array.from(selected));
    setSelected(new Set());
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
        אין לידים להצגה
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {selected.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-brand-600 dark:text-brand-400">{selected.size} נבחרו</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as LeadStatus | "")}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">שנה סטטוס...</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {bulkStatus && (
              <button
                onClick={applyBulkStatus}
                disabled={applyingBulk}
                className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {applyingBulk ? "מחיל..." : "החל"}
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={12} /> מחק
            </button>
            <button
              onClick={() => exportCsv(leads.filter(l => selected.has(l.id)))}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              ייצא נבחרים
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">{leads.length} לידים</span>
        )}
        <button
          onClick={() => exportCsv(leads)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Download size={13} />
          ייצוא CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                />
              </th>
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
              <tr
                key={lead.id}
                className={clsx(
                  "border-b border-gray-50 dark:border-gray-700/50 transition-colors",
                  selected.has(lead.id)
                    ? "bg-brand-50/50 dark:bg-brand-900/10"
                    : "hover:bg-gray-50/50 dark:hover:bg-gray-700/50"
                )}
              >
                <td className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400">
                    {lead.name}
                  </Link>
                  {lead.email && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.email}</div>}
                </td>
                <td className="px-4 py-3">
                  {onStatusChange ? (
                    <select
                      value={lead.current_status}
                      onChange={e => onStatusChange(lead.id, e.target.value as LeadStatus)}
                      className={clsx(
                        "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500",
                        statusColors[lead.current_status] || "bg-gray-100 text-gray-600"
                      )}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-full", statusColors[lead.current_status] || "bg-gray-100 text-gray-600")}>
                      {statusOptions.find(o => o.value === lead.current_status)?.label || lead.current_status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400">
                  {sourceLabels[lead.source] || lead.source}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                  {lead.ad_name || "—"}
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
