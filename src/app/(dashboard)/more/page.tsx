"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Calendar, Target, Settings, LogOut, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { href: "/campaigns", label: "קמפיינים", description: "ביצועי קמפיינים ממומנים", icon: BarChart3, color: "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" },
  { href: "/meetings", label: "פגישות", description: "לוח פגישות שבועי", icon: Calendar, color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  { href: "/goals", label: "יעדים", description: "יעדים רבעוניים ומעקב", icon: Target, color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  { href: "/settings", label: "הגדרות", description: "הגדרות המערכת", icon: Settings, color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" },
];

export default function MorePage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-gray-100">עוד</h1>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 dark:text-gray-200">{item.label}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</div>
            </div>
            <ChevronLeft size={18} className="text-gray-300 dark:text-gray-600" />
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-4 hover:shadow-md transition-shadow text-right"
      >
        <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-danger">
          <LogOut size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-danger">התנתק</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">יציאה מהחשבון</div>
        </div>
      </button>
    </div>
  );
}
