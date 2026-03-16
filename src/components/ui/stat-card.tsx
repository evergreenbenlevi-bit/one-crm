import { clsx } from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  change?: number; // percentage change, positive = good
  className?: string;
}

export function StatCard({ label, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div className={clsx("bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {Icon && <Icon size={18} className="text-gray-400 dark:text-gray-500" />}
      </div>
      <div className="text-2xl font-bold dark:text-gray-100">{value}</div>
      {change !== undefined && (
        <div className={clsx("flex items-center gap-1 mt-1 text-xs font-medium", change >= 0 ? "text-success" : "text-danger")}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(change)}% מהתקופה הקודמת</span>
        </div>
      )}
    </div>
  );
}
