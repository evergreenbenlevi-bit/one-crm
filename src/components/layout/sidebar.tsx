"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { preload } from "swr";
import { clsx } from "clsx";
import {
  LayoutDashboard, Users, Briefcase, DollarSign,
  BarChart3, Calendar, Target, Settings, LogOut,
  FileText, TrendingUp, CheckSquare, FolderKanban, FlaskConical,
  Newspaper, CalendarDays, Layers, Brain, GraduationCap
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "@/components/layout/global-search";
import { fetcher } from "@/lib/fetcher";
import type { UserRole } from "@/lib/rbac";

const routePrefetchMap: Record<string, string> = {
  "/tasks": "/api/tasks?exclude_backlog=1",
  "/leads": "/api/leads",
  "/customers": "/api/customers",
  "/financial": "/api/financial",
  "/meetings": "/api/meetings",
  "/content": "/api/content-ideas?type=all",
  "/news": "/api/news?topic=AI",
  "/research": "/api/research",
};

const navItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard, roles: ["admin", "user"] },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban, roles: ["admin", "user"] },
  { href: "/tasks", label: "משימות", icon: CheckSquare, roles: ["admin", "user"] },
  { href: "/triage", label: "Triage", icon: Layers, roles: ["admin", "user"] },
  { href: "/dump", label: "Brain Dump", icon: Brain, roles: ["admin", "user"] },
  { href: "/calendar", label: "לוח שנה", icon: Calendar, roles: ["admin"] },
  { href: "/leads", label: "לידים", icon: Users, roles: ["admin"] },
  { href: "/customers", label: "לקוחות", icon: Briefcase, roles: ["admin"] },
  { href: "/financial", label: "פיננסי", icon: DollarSign, roles: ["admin"] },
  { href: "/applications", label: "בקשות", icon: FileText, roles: ["admin"] },
  { href: "/campaigns", label: "קמפיינים", icon: BarChart3, roles: ["admin"] },
  { href: "/content", label: "תוכן", icon: TrendingUp, roles: ["admin"] },
  { href: "/content/calendar", label: "לוח תוכן", icon: CalendarDays, roles: ["admin"] },
  { href: "/news", label: "חדשות AI", icon: Newspaper, roles: ["admin"] },
  { href: "/meetings", label: "פגישות", icon: Calendar, roles: ["admin"] },
  { href: "/goals", label: "יעדים", icon: Target, roles: ["admin"] },
  { href: "/course-builder", label: "Course Builder", icon: GraduationCap, roles: ["admin", "course_editor"] },
  { href: "/research", label: "מחקרים", icon: FlaskConical, roles: ["admin"] },
  { href: "/settings", label: "הגדרות", icon: Settings, roles: ["admin"] },
];

export function Sidebar({ role = "admin", userEmail }: { role?: UserRole; userEmail?: string | null }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => item.roles.includes(role)
  );

  async function handleLogout() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* local mode — no supabase */ }
    window.location.href = "/login";
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-xl font-bold text-brand-700 dark:text-brand-400 mb-4">ONE™ CRM</h1>
        <GlobalSearch />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => {
                const url = routePrefetchMap[item.href];
                if (url) preload(url, fetcher);
              }}
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {userEmail && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 flex-shrink-0">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{userEmail.split("@")[0]}</p>
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded font-bold",
                role === "admin" ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"
              )}>
                {role === "admin" ? "מנהל" : "צוות"}
              </span>
            </div>
          </div>
        )}
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 w-full transition-colors"
        >
          <LogOut size={20} />
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
