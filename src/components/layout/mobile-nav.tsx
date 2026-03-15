"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, Users, Briefcase, DollarSign, MoreHorizontal
} from "lucide-react";

const mobileNavItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/leads", label: "לידים", icon: Users },
  { href: "/customers", label: "לקוחות", icon: Briefcase },
  { href: "/financial", label: "פיננסי", icon: DollarSign },
  { href: "/more", label: "עוד", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-brand-600" : "text-gray-400"
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
