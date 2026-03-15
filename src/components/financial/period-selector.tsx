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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {periods.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            current === key
              ? "bg-white text-brand-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
