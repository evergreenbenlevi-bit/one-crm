"use client";

import dynamic from "next/dynamic";

const TrendsChartDynamic = dynamic(
  () => import("@/components/financial/trends-chart").then((m) => ({ default: m.TrendsChart })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-[340px] bg-gray-100 dark:bg-gray-800 rounded-2xl" />,
  }
);

interface TrendsChartClientProps {
  transactions: Array<{ amount: number; date: string; program: string }>;
  expenses: Array<{ amount: number; date: string }>;
  campaigns: Array<{ daily_spend: number; date: string }>;
}

export function TrendsChartClient(props: TrendsChartClientProps) {
  return <TrendsChartDynamic {...props} />;
}
