import type { Goal } from "@/lib/types/database";

interface GoalProgressProps {
  goal: Goal | null;
}

export function GoalProgress({ goal }: GoalProgressProps) {
  if (!goal) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-gray-400 text-sm">לא הוגדר יעד רבעוני. <a href="/goals" className="text-brand-600 hover:underline">הגדר יעד</a></p>
      </div>
    );
  }

  const percentage = goal.target_value > 0
    ? Math.min(Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100), 100)
    : 0;

  const now = new Date();
  const quarterEnd = new Date(goal.year, goal.quarter * 3, 0);
  const daysLeft = Math.max(0, Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const labels: Record<string, string> = {
    revenue: "הכנסות",
    customers: "לקוחות",
    custom: goal.label,
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-medium text-gray-700">
            יעד רבעוני: {labels[goal.target_type] || goal.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">נותרו {daysLeft} ימים</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
        <div
          className="bg-brand-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-brand-700">{percentage}%</span>
        <span className="text-gray-500">
          {Number(goal.current_value).toLocaleString("he-IL")} / {Number(goal.target_value).toLocaleString("he-IL")}
          {goal.target_type === "revenue" ? " ₪" : ""}
        </span>
      </div>
    </div>
  );
}
