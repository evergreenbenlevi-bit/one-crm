"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

const periods = [
  { key: "month", label: "חודש" },
  { key: "quarter", label: "רבעון" },
  { key: "year", label: "שנה" },
] as const;

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") || "month";

  function handleSelect(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/financial?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
      {periods.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            current === key
              ? "bg-white dark:bg-gray-600 text-brand-600 shadow-sm dark:shadow-gray-900/20"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
