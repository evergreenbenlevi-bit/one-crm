import type { Goal } from "@/lib/types/database";

interface GoalHistoryProps {
  goals: Goal[];
}

const typeLabels: Record<string, string> = {
  revenue: "הכנסה",
  customers: "לקוחות",
  custom: "מותאם",
};

export function GoalHistory({ goals }: GoalHistoryProps) {
  if (goals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
        אין היסטוריית יעדים
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-medium text-gray-700 dark:text-gray-300">היסטוריית יעדים</h3>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {goals.map((goal) => {
          const percentage = goal.target_value > 0
            ? Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100)
            : 0;

          const achieved = percentage >= 100;
          const label = goal.label || typeLabels[goal.target_type] || goal.target_type;

          return (
            <div key={goal.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Q{goal.quarter} {goal.year}
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {label}
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  achieved ? "text-success" : percentage >= 70 ? "text-warning" : "text-danger"
                }`}>
                  {percentage}%
                </span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    achieved ? "bg-success" : percentage >= 70 ? "bg-warning" : "bg-danger"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span>
                  {Number(goal.current_value).toLocaleString("he-IL")} / {Number(goal.target_value).toLocaleString("he-IL")}
                  {goal.target_type === "revenue" ? " ₪" : ""}
                </span>
                <span>{achieved ? "הושג" : "לא הושג"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
