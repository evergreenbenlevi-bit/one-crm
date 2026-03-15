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
    <div className={clsx("bg-white rounded-2xl p-5 shadow-sm border border-gray-100", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        {Icon && <Icon size={18} className="text-gray-400" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={clsx("flex items-center gap-1 mt-1 text-xs font-medium", change >= 0 ? "text-success" : "text-danger")}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(change)}% מהתקופה הקודמת</span>
        </div>
      )}
    </div>
  );
}
