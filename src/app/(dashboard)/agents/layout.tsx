"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutGrid, List, GitBranch, DollarSign, Clock, FileText, MessageSquare
} from "lucide-react";

const tabs = [
  { href: "/agents", label: "סקירה", icon: LayoutGrid, exact: true },
  { href: "/agents/registry", label: "רישום", icon: List },
  { href: "/agents/topology", label: "טופולוגיה", icon: GitBranch },
  { href: "/agents/costs", label: "עלויות", icon: DollarSign },
  { href: "/agents/crons", label: "קרונים", icon: Clock },
  { href: "/agents/logs", label: "לוגים", icon: FileText },
  { href: "/agents/chat", label: "צ׳אט", icon: MessageSquare },
];

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
