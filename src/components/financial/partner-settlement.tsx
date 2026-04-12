"use client";

import { useState } from "react";
import { Users, CheckCircle2, ArrowLeftRight } from "lucide-react";

const VAT_RATE = 1.18;

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

function fmtExVat(n: number) {
  return `₪${Math.abs(n / VAT_RATE).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
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
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">חשבון שותפים</h3>
        </div>
        {!settled && absAmount > 0 && (
          <button
            onClick={handleSettle}
            disabled={settling}
            className="text-xs px-3 py-1.5 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
          >
            {settling ? "..." : "סגור תקופה"}
          </button>
        )}
        {settled && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <CheckCircle2 size={14} /> נסגר
          </span>
        )}
      </div>

      {/* Partner amounts — gross + net ex-VAT side by side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Ben */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">בן שילם</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">כולל מע"מ</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(benPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">נטו (ללא מע"מ)</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{fmtExVat(benPaid)}</span>
            </div>
          </div>
        </div>

        {/* Avitar */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">אביתר שילם</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">כולל מע"מ</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(avitarPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">נטו (ללא מע"מ)</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{fmtExVat(avitarPaid)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement row */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">הפרש להתחשבנות</span>
        {absAmount === 0 ? (
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">מאוזן</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(absAmount)}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              {owesPerson} <ArrowLeftRight size={10} /> {owedPerson}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
