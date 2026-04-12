"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddServiceCallModal({ open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [form, setForm] = useState({
    customer_id: "",
    call_date: new Date().toISOString().slice(0, 16),
    topic: "",
    response_time_hours: "",
    satisfaction_rating: "",
    nps_score: "",
    notes: "",
    resolved: false,
  });

  useEffect(() => {
    if (open) {
      fetch("/api/customers")
        .then(r => r.json())
        .then(data => setCustomers(Array.isArray(data) ? data : []))
        .catch(() => setCustomers([]));
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!form.topic.trim() || !form.call_date) {
      setError("נושא ותאריך הם שדות חובה");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        call_date: new Date(form.call_date).toISOString(),
        topic: form.topic.trim(),
        resolved: form.resolved,
      };
      if (form.customer_id) body.customer_id = form.customer_id;
      if (form.response_time_hours !== "") body.response_time_hours = Number(form.response_time_hours);
      if (form.satisfaction_rating !== "") body.satisfaction_rating = Number(form.satisfaction_rating);
      if (form.nps_score !== "") body.nps_score = Number(form.nps_score);
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/service-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">הוסף שיחת שירות</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">לקוח</label>
            <select
              value={form.customer_id}
              onChange={e => setForm(prev => ({ ...prev, customer_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— ללא לקוח ספציפי —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">תאריך ושעה *</label>
            <input
              type="datetime-local"
              value={form.call_date}
              onChange={e => setForm(prev => ({ ...prev, call_date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">נושא *</label>
            <input
              type="text"
              value={form.topic}
              onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">זמן מענה (שעות)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.response_time_hours}
                onChange={e => setForm(prev => ({ ...prev, response_time_hours: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">שביעות רצון (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={form.satisfaction_rating}
                onChange={e => setForm(prev => ({ ...prev, satisfaction_rating: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">NPS (-100 עד 100)</label>
              <input
                type="number"
                min="-100"
                max="100"
                value={form.nps_score}
                onChange={e => setForm(prev => ({ ...prev, nps_score: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">הערות</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="resolved"
              checked={form.resolved}
              onChange={e => setForm(prev => ({ ...prev, resolved: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="resolved" className="text-sm font-medium text-gray-600 dark:text-gray-400">טופל</label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {saving ? "שומר..." : "הוסף שיחה"}
          </button>
        </div>
      </div>
    </div>
  );
}
