"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { MeetingType } from "@/lib/types/database";

const typeOptions: { value: MeetingType; label: string }[] = [
  { value: "discovery_call", label: "שיחת גילוי" },
  { value: "onboarding", label: "פגישת Onboarding" },
  { value: "monthly_1on1", label: "פגישה 1:1 חודשית" },
  { value: "strategy_session", label: "פגישת אסטרטגיה" },
  { value: "group_zoom", label: "זום קבוצתי" },
  { value: "workshop", label: "סדנה" },
];

interface Customer { id: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultDate?: string;
}

export function MeetingAddModal({ open, onClose, onCreated, defaultDate }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [form, setForm] = useState({
    customer_id: "",
    type: "monthly_1on1" as MeetingType,
    date: defaultDate || new Date().toISOString().slice(0, 16),
    summary: "",
  });

  useEffect(() => {
    if (open) {
      fetch("/api/customers")
        .then(r => r.json())
        .then(data => setCustomers(Array.isArray(data) ? data : []));
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (!form.customer_id) { setError("בחר לקוח"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: form.customer_id,
          type: form.type,
          date: new Date(form.date).toISOString(),
          summary: form.summary.trim() || null,
          status: "scheduled",
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "שגיאה"); }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">הוספת פגישה</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">לקוח *</label>
            <select
              value={form.customer_id}
              onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">בחר לקוח...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">סוג פגישה</label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value as MeetingType }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">תאריך ושעה</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">הערות (אופציונלי)</label>
            <textarea
              value={form.summary}
              onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              rows={2}
              placeholder="נושאים לדיון, הערות..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            ביטול
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? "שומר..." : "הוסף פגישה"}
          </button>
        </div>
      </div>
    </div>
  );
}
