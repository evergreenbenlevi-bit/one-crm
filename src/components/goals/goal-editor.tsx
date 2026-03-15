"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GoalType } from "@/lib/types/database";

const goalTypes: { key: GoalType; label: string }[] = [
  { key: "revenue", label: "הכנסה" },
  { key: "customers", label: "לקוחות" },
  { key: "custom", label: "מותאם" },
];

export function GoalEditor() {
  const router = useRouter();
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  const [quarter, setQuarter] = useState(currentQuarter);
  const [year, setYear] = useState(currentYear);
  const [targetType, setTargetType] = useState<GoalType>("revenue");
  const [targetValue, setTargetValue] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quarter,
          year,
          target_type: targetType,
          target_value: Number(targetValue),
          label: label || goalTypes.find(g => g.key === targetType)?.label || "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "שגיאה בשמירה");
      }

      setMessage({ type: "success", text: "היעד נשמר בהצלחה" });
      setTargetValue("");
      setLabel("");
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-medium text-gray-700 mb-4">הגדר יעד חדש</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">רבעון</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {[1, 2, 3, 4].map(q => (
                <option key={q} value={q}>Q{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">שנה</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">סוג יעד</label>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {goalTypes.map(({ key, label: typeLabel }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTargetType(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  targetType === key
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {typeLabel}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            ערך יעד {targetType === "revenue" ? "(₪)" : targetType === "customers" ? "(מספר)" : ""}
          </label>
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={targetType === "revenue" ? "50000" : "10"}
            required
            min="1"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">תיאור (אופציונלי)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="למשל: הכנסה חודשית ממוצעת"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !targetValue}
          className="w-full bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "שומר..." : "שמור יעד"}
        </button>

        {message && (
          <div className={`text-sm text-center rounded-xl px-3 py-2 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
