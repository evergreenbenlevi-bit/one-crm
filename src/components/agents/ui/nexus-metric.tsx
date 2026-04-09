"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface NexusMetricProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "flat";
  accentColor?: string;
}

export function NexusMetric({ value, label, icon, accentColor }: NexusMetricProps) {
  return (
    <div className="nexus-card p-4 flex items-center gap-3">
      {icon && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{
            background: accentColor
              ? `${accentColor}15`
              : "rgba(0, 212, 255, 0.1)",
            color: accentColor || "var(--nexus-accent)",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <motion.p
          className="nexus-metric-value"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={String(value)}
        >
          {value}
        </motion.p>
        <p className="nexus-metric-label">{label}</p>
      </div>
    </div>
  );
}
