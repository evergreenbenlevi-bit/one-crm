import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react";

interface KpiRowProps {
  revenue: number;
  expenses: number;
  profit: number;
  roi: number;
}

function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("he-IL")}`;
}

export function KpiRow({ revenue, expenses, profit, roi }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="סה״כ הכנסות"
        value={formatCurrency(revenue)}
        icon={DollarSign}
        className="border-brand-100"
      />
      <StatCard
        label="סה״כ הוצאות"
        value={formatCurrency(expenses)}
        icon={TrendingDown}
        className="border-red-100"
      />
      <StatCard
        label="רווח נקי"
        value={formatCurrency(profit)}
        icon={TrendingUp}
        change={profit >= 0 ? undefined : undefined}
        className={profit >= 0 ? "border-green-100" : "border-red-100"}
      />
      <StatCard
        label="ROI"
        value={`${roi}%`}
        icon={Percent}
        className={roi >= 0 ? "border-green-100" : "border-red-100"}
      />
    </div>
  );
}
