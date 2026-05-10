"use client";

import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-2" : "py-16 gap-3",
        className
      )}
    >
      <div className="rounded-full bg-gray-800/60 p-3 ring-1 ring-white/10">
        <Icon className={clsx("text-gray-300", compact ? "w-4 h-4" : "w-6 h-6")} />
      </div>
      <p className={clsx("font-medium text-gray-400", compact ? "text-xs" : "text-sm")}>{title}</p>
      {description && (
        <p className={clsx("text-gray-500 max-w-xs", compact ? "text-[10px]" : "text-xs")}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 text-xs px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
