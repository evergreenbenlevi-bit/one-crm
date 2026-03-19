"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, Users, Briefcase, DollarSign,
  BarChart3, Calendar, Target, Settings, LogOut,
  FileText, TrendingUp, CheckSquare, FolderKanban
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "@/components/layout/global-search";
import type { UserRole } from "@/lib/rbac";

const navItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard, adminOnly: false },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban, adminOnly: false },
  { href: "/tasks", label: "משימות", icon: CheckSquare, adminOnly: false },
  { href: "/leads", label: "לידים", icon: Users, adminOnly: false },
  { href: "/customers", label: "לקוחות", icon: Briefcase, adminOnly: false },
  { href: "/financial", label: "פיננסי", icon: DollarSign, adminOnly: false },
  { href: "/applications", label: "בקשות", icon: FileText, adminOnly: false },
  { href: "/campaigns", label: "קמפיינים", icon: BarChart3, adminOnly: false },
  { href: "/content", label: "תוכן", icon: TrendingUp, adminOnly: true },
  { href: "/meetings", label: "פגישות", icon: Calendar, adminOnly: false },
  { href: "/goals", label: "יעדים", icon: Target, adminOnly: true },
  { href: "/settings", label: "הגדרות", icon: Settings, adminOnly: true },
];

export function Sidebar({ role = "admin" }: { role?: UserRole }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
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

      <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
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
