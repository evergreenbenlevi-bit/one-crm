"use client";

import dynamic from "next/dynamic";

const CalendarInner = dynamic(
  () => import("@/components/calendar/calendar-inner"),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-[640px] bg-gray-100 dark:bg-gray-800 rounded-2xl m-6" />,
  }
);

export default function CalendarPage() {
  return <CalendarInner />;
}
