"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

const BUSINESS_CATEGORIES = [
  { value: "meta_ads", label: "פרסום מטא" },
  { value: "ai_tools", label: "כלי AI" },
  { value: "editing_design", label: "עריכה ועיצוב" },
  { value: "software", label: "תוכנות" },
  { value: "content_creation", label: "יצירת תוכן" },
  { value: "coaching_tools", label: "כלי ליווי" },
  { value: "education", label: "לימודים" },
  { value: "skool", label: "Skool" },
  { value: "other", label: "אחר" },
];

const PERSONAL_CATEGORIES = [
  { value: "haircut", label: "✂️ תספורת" },
  { value: "fuel", label: "⛽ דלק" },
  { value: "car_wash", label: "🚿 שטיפת רכב" },
  { value: "groceries", label: "🛒 מכולת" },
  { value: "personal_other", label: "📦 אישי אחר" },
];

const ALL_CATEGORIES = [
  { group: "עסקי", items: BUSINESS_CATEGORIES },
  { group: "אישי", items: PERSONAL_CATEGORIES },
];

const PARTNERS = [
  { value: "ben", label: "בן" },
  { value: "avitar", label: "אביתר" },
  { value: "shared", label: "משותף" },
];

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    category: "other",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    paid_by: "shared",
    split_ratio: "0.5",
    is_recurring: false,
  });

  const isPersonal = PERSONAL_CATEGORIES.some(c => c.value === form.category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          split_ratio: isPersonal ? 0 : parseFloat(form.split_ratio),
          expense_type: isPersonal ? "personal" : "business",
          paid_by: isPersonal ? "ben" : form.paid_by,
        }),
      });
      if (res.ok) {
        setForm({
          category: "other",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          paid_by: "shared",
          split_ratio: "0.5",
          is_recurring: false,
        });
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
      >
        <Plus size={16} />
        הוסף הוצאה
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">הוצאה חדשה</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Category */}
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
        >
          {ALL_CATEGORIES.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Amount */}
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="סכום ₪"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
        />

        {/* Date */}
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
        />

        {/* Paid By — hidden for personal expenses (always ben) */}
        {isPersonal ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            אישי — בן
          </div>
        ) : (
          <div className="flex gap-1">
            {PARTNERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, paid_by: p.value })}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                  form.paid_by === p.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Description - full width */}
        <input
          type="text"
          placeholder="תיאור"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
        />

        {/* Split ratio - only if shared */}
        {form.paid_by === "shared" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">חלוקה (בן):</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={form.split_ratio}
              onChange={(e) => setForm({ ...form, split_ratio: e.target.value })}
              className="flex-1"
            />
            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-12 text-center">
              {Math.round(parseFloat(form.split_ratio) * 100)}%
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !form.amount}
          className="col-span-2 lg:col-span-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "שומר..." : "שמור"}
        </button>
      </form>
    </div>
  );
}
