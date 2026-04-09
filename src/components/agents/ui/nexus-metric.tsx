"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface NexusMetricProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "flat";
  accentColor?: string;
  subtitle?: string;
}

export function NexusMetric({ value, label, icon, accentColor, subtitle }: NexusMetricProps) {
  return (
    <div
      className="nexus-card p-5 flex items-center gap-4 transition-all hover:nexus-card-glow"
      style={{ minHeight: "88px" }}
    >
      {icon && (
        <div
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl"
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
      <div className="min-w-0">
        <motion.p
          className="nexus-metric-value"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={String(value)}
        >
          {value}
        </motion.p>
        <p className="nexus-metric-label">{label}</p>
        {subtitle && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
