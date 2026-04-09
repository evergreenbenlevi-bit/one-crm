"use client";

import { useState } from "react";
import { Users, CheckCircle2, ArrowLeftRight } from "lucide-react";

interface PartnerSettlementProps {
  benPaid: number;
  avitarPaid: number;
  settlementAmount: number;
  periodStart: string;
  periodEnd: string;
}

function fmt(n: number) {
  return `₪${Math.abs(n).toLocaleString("he-IL")}`;
}

export function PartnerSettlement({
  benPaid,
  avitarPaid,
  settlementAmount,
  periodStart,
  periodEnd,
}: PartnerSettlementProps) {
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);

  const owesPerson = settlementAmount > 0 ? "אביתר" : "בן";
  const owedPerson = settlementAmount > 0 ? "בן" : "אביתר";
  const absAmount = Math.abs(settlementAmount);

  async function handleSettle() {
    setSettling(true);
    try {
      await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      });
      setSettled(true);
    } finally {
      setSettling(false);
    }
  }

  if (benPaid === 0 && avitarPaid === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">חשבון שותפים</h3>
        </div>
        {!settled && absAmount > 0 && (
          <button
            onClick={handleSettle}
            disabled={settling}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {settling ? "..." : "סגור תקופה"}
          </button>
        )}
        {settled && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 size={14} /> נסגר
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Ben paid */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">בן שילם</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(benPaid)}</p>
        </div>

        {/* Avitar paid */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">אביתר שילם</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(avitarPaid)}</p>
        </div>

        {/* Settlement */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">הפרש</p>
          {absAmount === 0 ? (
            <p className="text-lg font-bold text-green-600 dark:text-green-400">מאוזן</p>
          ) : (
            <div>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmt(absAmount)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                {owesPerson} <ArrowLeftRight size={10} /> {owedPerson}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
