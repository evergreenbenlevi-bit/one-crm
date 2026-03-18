import { clsx } from "clsx";
import type { ScoreLevel } from "@/lib/scoring";

const scoreColors: Record<ScoreLevel, string> = {
  cold: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  warm: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  hot: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  ready: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const scoreLevelLabels: Record<ScoreLevel, string> = {
  cold: "קר",
  warm: "חמים",
  hot: "חם",
  ready: "מוכן",
};

interface ScoreBadgeProps {
  score: number;
  level: ScoreLevel;
  className?: string;
}

export function ScoreBadge({ score, level, className }: ScoreBadgeProps) {
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", scoreColors[level], className)}>
      <span>{score}</span>
      <span>·</span>
      <span>{scoreLevelLabels[level]}</span>
    </span>
  );
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "חדש", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  consumed_content: { label: "צרך תוכן", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  engaged: { label: "ביצע אינטראקציה", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  applied: { label: "הגיש בקשה", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  qualified: { label: "מתאים", color: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  onboarding: { label: "בתהליך קליטה", color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  active_client: { label: "לקוח פעיל", color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  completed: { label: "סיים תוכנית", color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  lost: { label: "אבוד", color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: "bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.color, className)}>
      {config.label}
    </span>
  );
}
