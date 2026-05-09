"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types/tasks";

export function TasksDomainSplit() {
  const [counts, setCounts] = useState<{ business: number; personal: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/tasks?exclude_backlog=1")
      .then((r) => r.json())
      .then((data: Task[]) => {
        const open = (Array.isArray(data) ? data : []).filter(
          (t) => t.status !== "done" && !t.archived_at
        );
        const business = open.filter((t) => t.domain === "business").length;
        const personal = open.filter((t) => t.domain === "personal").length;
        setCounts({ business, personal, total: open.length });
      })
      .catch(() => setCounts({ business: 0, personal: 0, total: 0 }));
  }, []);

  if (!counts) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white" dir="rtl">
          משימות פתוחות לפי תחום
        </h3>
        <span className="text-xs text-gray-500">{counts.total} סה"כ</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/tasks"
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300" dir="rtl">עסק</span>
          <span className="text-3xl font-bold text-blue-900 dark:text-blue-200">{counts.business}</span>
        </Link>
        <Link
          href="/tasks"
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300" dir="rtl">אישי</span>
          <span className="text-3xl font-bold text-emerald-900 dark:text-emerald-200">{counts.personal}</span>
        </Link>
      </div>
    </div>
  );
}
