import { clsx } from "clsx";

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "ליד חדש", color: "bg-blue-50 text-blue-700" },
  watched_vsl: { label: "צפה בסרטון", color: "bg-purple-50 text-purple-700" },
  got_wa: { label: "קיבל וואטסאפ", color: "bg-indigo-50 text-indigo-700" },
  filled_questionnaire: { label: "מילא שאלון", color: "bg-amber-50 text-amber-700" },
  sales_call: { label: "שיחת מכירה", color: "bg-orange-50 text-orange-700" },
  closed: { label: "סגר", color: "bg-green-50 text-green-700" },
  lost: { label: "אבוד", color: "bg-red-50 text-red-700" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: "bg-gray-50 text-gray-700" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.color, className)}>
      {config.label}
    </span>
  );
}
