"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, Users, Briefcase, CalendarDays, MoreHorizontal, CheckSquare, FolderKanban, Target, Brain
} from "lucide-react";
import type { UserRole } from "@/lib/rbac";

const adminNavItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/leads", label: "לידים", icon: Users },
  { href: "/triage", label: "טריאז׳", icon: Target },
  { href: "/meetings", label: "פגישות", icon: CalendarDays },
  { href: "/more", label: "עוד", icon: MoreHorizontal },
];

const teamNavItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban },
  { href: "/tasks", label: "משימות", icon: CheckSquare },
];

export function MobileNav({ role = "admin" }: { role?: UserRole }) {
  const pathname = usePathname();

  const visibleItems = role === "admin" ? adminNavItems : teamNavItems;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around items-center h-16 pb-safe">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"
              )}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
