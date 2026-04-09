"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutGrid, List, GitBranch, DollarSign, Clock, FileText, MessageSquare
} from "lucide-react";
import "./nexus-theme.css";

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
    <div
      className="min-h-screen nexus-grid-bg"
      style={{ background: "var(--nexus-bg-base)", color: "var(--nexus-text-1)" }}
    >
      {/* Navigation bar */}
      <nav
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{
          background: "rgba(13, 15, 20, 0.8)",
          borderColor: "var(--nexus-border)",
        }}
      >
        <div className="flex items-center gap-1 px-4 overflow-x-auto nexus-scroll scrollbar-hide">
          {/* NEXUS brand mark */}
          <span
            className="text-xs font-bold tracking-widest mr-4 px-2 py-1 rounded"
            style={{
              color: "var(--nexus-accent)",
              background: "var(--nexus-accent-glow)",
              fontFamily: "var(--nexus-font-mono)",
            }}
          >
            NEXUS
          </span>

          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href) && !(tab.exact === undefined && pathname === "/agents" && tab.href !== "/agents");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx("nexus-tab flex items-center gap-2", isActive && "nexus-tab-active")}
              >
                <tab.icon size={14} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
