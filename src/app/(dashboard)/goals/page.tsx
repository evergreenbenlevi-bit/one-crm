import { getGoals, getCurrentGoal } from "@/lib/queries/goals";
import { GoalEditor } from "@/components/goals/goal-editor";
import { GoalHistory } from "@/components/goals/goal-history";
import { Target } from "lucide-react";
import type { Goal } from "@/lib/types/database";

const typeLabels: Record<string, string> = {
  revenue: "הכנסה",
  customers: "לקוחות",
  custom: "מותאם",
};

export default async function GoalsPage() {
  const [goals, currentGoal] = await Promise.all([
    getGoals(),
    getCurrentGoal(),
  ]);

  // Separate current from history
  const pastGoals = currentGoal
    ? goals.filter((g: Goal) => g.id !== currentGoal.id)
    : goals;

  // Calculate current goal progress
  const percentage = currentGoal && currentGoal.target_value > 0
    ? Math.min(Math.round((Number(currentGoal.current_value) / Number(currentGoal.target_value)) * 100), 100)
    : 0;

  const now = new Date();
  const quarterEnd = currentGoal
    ? new Date(currentGoal.year, currentGoal.quarter * 3, 0)
    : new Date();
  const daysLeft = currentGoal
    ? Math.max(0, Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Target size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">יעדים</h1>
          <p className="text-sm text-gray-400">הגדרה ומעקב אחרי יעדים רבעוניים</p>
        </div>
      </div>

      {/* Current Goal */}
      {currentGoal ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-800">
              יעד נוכחי: Q{currentGoal.quarter} {currentGoal.year}
            </h2>
            <span className="text-xs text-gray-400">נותרו {daysLeft} ימים</span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {currentGoal.label || typeLabels[currentGoal.target_type] || currentGoal.target_type}
          </p>

          {/* Large progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-6 mb-3 overflow-hidden">
            <div
              className="bg-brand-500 h-6 rounded-full transition-all duration-700 flex items-center justify-center"
              style={{ width: `${Math.max(percentage, 8)}%` }}
            >
              {percentage >= 15 && (
                <span className="text-xs font-bold text-white">{percentage}%</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            {percentage < 15 && (
              <span className="font-bold text-brand-700">{percentage}%</span>
            )}
            {percentage >= 15 && <span />}
            <span className="text-gray-500">
              {Number(currentGoal.current_value).toLocaleString("he-IL")} / {Number(currentGoal.target_value).toLocaleString("he-IL")}
              {currentGoal.target_type === "revenue" ? " ₪" : ""}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <Target size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">לא הוגדר יעד לרבעון הנוכחי</p>
          <p className="text-xs text-gray-300">הגדר יעד חדש למטה</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <GoalEditor />
        <GoalHistory goals={pastGoals} />
      </div>
    </div>
  );
}
