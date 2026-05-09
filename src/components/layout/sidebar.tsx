"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { preload } from "swr";
import useSWR from "swr";
import { clsx } from "clsx";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Moon, Calendar, ChevronDown, ChevronRight,
  Briefcase, User, Megaphone, Settings, LogOut,
  CheckSquare, FolderKanban, DollarSign, Users, Phone,
  BarChart3, TrendingUp, CalendarDays, Newspaper, Target,
  Dumbbell, GraduationCap, Bot, FlaskConical, Telescope,
  Brain, Layers, FileText, LayoutList,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "@/components/layout/global-search";
import { fetcher } from "@/lib/fetcher";
import type { UserRole } from "@/lib/rbac";
import type { AreaWithFolders } from "@/lib/types/areas";

// ── Route prefetch map ──
const routePrefetchMap: Record<string, string> = {
  "/tasks": "/api/tasks?exclude_backlog=1",
  "/leads": "/api/leads",
  "/customers": "/api/customers",
  "/financial": "/api/financial",
  "/content": "/api/content-ideas?type=all",
  "/news": "/api/news?topic=AI",
  "/research": "/api/research",
};

// ── Icon map for folder/area icon names from DB ──
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Briefcase,
  User,
  Megaphone,
  Settings,
  CheckSquare,
  FolderKanban,
  DollarSign,
  Users,
  Phone,
  BarChart3,
  TrendingUp,
  CalendarDays,
  Newspaper,
  Target,
  Dumbbell,
  GraduationCap,
  Bot,
  FlaskConical,
  Telescope,
  Brain,
  Layers,
  FileText,
  LayoutDashboard,
  Calendar,
};

// ── Pinned nav items — always shown above area groups ──
const PINNED_ITEMS = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard, roles: ["admin", "user", "course_editor"] },
  { href: "/eod", label: "סיכום יום", icon: Moon, roles: ["admin", "user"] },
  { href: "/calendar", label: "לוח שנה", icon: Calendar, roles: ["admin"] },
  { href: "/master", label: "Master Plan", icon: LayoutList, roles: ["admin"] },
];

// ── Admin-only standalone items not in any folder group ──
// These appear in the sidebar when no area groups exist yet (fallback)
// and are also mapped to folder hrefs for active-state detection
const ADMIN_STANDALONE: { href: string; roles: string[] }[] = [
  { href: "/leads", roles: ["admin"] },
  { href: "/customers", roles: ["admin"] },
  { href: "/service", roles: ["admin"] },
  { href: "/financial", roles: ["admin"] },
  { href: "/applications", roles: ["admin"] },
  { href: "/meetings", roles: ["admin"] },
  { href: "/goals", roles: ["admin"] },
];

// ── localStorage helpers for collapsed state ──
const STORAGE_KEY = "sidebar-collapsed-areas";

function loadCollapsedState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Folder icon resolver ──
function FolderIcon({ iconName, size = 16 }: { iconName: string | null; size?: number }) {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  if (!Icon) return null;
  return <Icon size={size} className="flex-shrink-0 opacity-60" />;
}

// ── Area icon resolver ──
function AreaIconComponent({ iconName, size = 16 }: { iconName: string | null; size?: number }) {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  if (!Icon) return null;
  return <Icon size={size} className="flex-shrink-0" />;
}

// ── Single area group ──
function AreaGroup({
  area,
  pathname,
  collapsed,
  onToggle,
}: {
  area: AreaWithFolders;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const hasActiveFolder = area.folders.some(
    (f) => f.href && (pathname === f.href || (f.href !== "/" && pathname.startsWith(f.href)))
  );

  return (
    <div className="mb-1">
      {/* Area header — clickable to collapse/expand */}
      <button
        onClick={onToggle}
        className={clsx(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
          hasActiveFolder
            ? "text-gray-100"
            : "text-gray-500 dark:text-gray-500 hover:text-gray-300 dark:hover:text-gray-300"
        )}
      >
        <AreaIconComponent iconName={area.icon} size={14} />
        <span className="flex-1 text-left">{area.name}</span>
        {collapsed ? (
          <ChevronRight size={13} className="opacity-50" />
        ) : (
          <ChevronDown size={13} className="opacity-50" />
        )}
      </button>

      {/* Folders list */}
      {!collapsed && (
        <div className="ml-2 space-y-0.5">
          {area.folders.map((folder) => {
            if (!folder.href) return null;

            const isActive =
              pathname === folder.href ||
              (folder.href !== "/" && pathname.startsWith(folder.href));

            return (
              <Link
                key={folder.id}
                href={folder.href}
                onMouseEnter={() => {
                  const url = routePrefetchMap[folder.href!];
                  if (url) preload(url, fetcher);
                }}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                )}
              >
                <FolderIcon iconName={folder.icon} size={15} />
                <span>{folder.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar component ──
export function Sidebar({ role = "admin", userEmail }: { role?: UserRole; userEmail?: string | null }) {
  const pathname = usePathname();

  // Fetch areas + folders from API
  const { data: areas } = useSWR<AreaWithFolders[]>("/api/areas", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  // Collapsed state per area slug
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsed(loadCollapsedState());
  }, []);

  const toggleArea = useCallback(
    (slug: string) => {
      setCollapsed((prev) => {
        const next = { ...prev, [slug]: !prev[slug] };
        saveCollapsedState(next);
        return next;
      });
    },
    []
  );

  async function handleLogout() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* local mode — no supabase */ }
    window.location.href = "/login";
  }

  const pinnedItems = PINNED_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
      {/* Logo + search */}
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white mb-3 tracking-tight">EDEN™ CRM</h1>
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Pinned items — always on top */}
        {pinnedItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Divider before area groups */}
        {pinnedItems.length > 0 && areas && areas.length > 0 && (
          <div className="my-2 border-t border-gray-800" />
        )}

        {/* Area groups — DB driven */}
        {areas?.map((area) => (
          <AreaGroup
            key={area.id}
            area={area}
            pathname={pathname}
            collapsed={!!collapsed[area.slug]}
            onToggle={() => toggleArea(area.slug)}
          />
        ))}

        {/* Fallback: show admin-only items if no areas loaded yet */}
        {(!areas || areas.length === 0) && role === "admin" && (
          <>
            <div className="my-2 border-t border-gray-800" />
            {[
              { href: "/tasks", label: "משימות", icon: CheckSquare },
              { href: "/projects", label: "פרויקטים", icon: FolderKanban },
              { href: "/leads", label: "לידים", icon: Users },
              { href: "/financial", label: "פיננסי", icon: DollarSign },
              { href: "/proposals", label: "הצעות מחיר", icon: FileText },
              { href: "/triage", label: "Triage", icon: Layers },
              { href: "/dump", label: "Brain Dump", icon: Brain },
              { href: "/agents", label: "מרכז שליטה", icon: Bot },
              { href: "/creator-intel", label: "Creator Intel", icon: Telescope },
              { href: "/settings", label: "הגדרות", icon: Settings },
            ].map((item) => {
              const isActive =
                pathname === item.href ||
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
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom user block */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {userEmail && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 flex-shrink-0">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-300 truncate">{userEmail.split("@")[0]}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-gray-500">
                {role === "admin" ? "מנהל" : "צוות"}
              </span>
            </div>
          </div>
        )}
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-gray-200 w-full transition-colors"
        >
          <LogOut size={18} />
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
