"use client";

import { motion } from "framer-motion";

interface Props {
  total: number;
  healthy: number;
  down: number;
  degraded: number;
}

export function SystemPulse({ total, healthy, down, degraded }: Props) {
  const healthPercent = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  const healthOffset = circumference - (circumference * healthPercent) / 100;
  const downOffset = circumference - (circumference * (down / Math.max(total, 1))) * 100 / 100;

  return (
    <div className="flex items-center gap-6">
      {/* Animated ring */}
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="6"
          />
          {/* Health ring */}
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={down > 0 ? "var(--nexus-warn)" : "var(--nexus-ok)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: healthOffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          {/* Error ring (inner) */}
          {down > 0 && (
            <motion.circle
              cx="50" cy="50" r="35"
              fill="none"
              stroke="var(--nexus-err)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 35}
              initial={{ strokeDashoffset: 2 * Math.PI * 35 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 35) - ((2 * Math.PI * 35 * down) / Math.max(total, 1)) }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          )}
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--nexus-text-1)", fontFamily: "var(--nexus-font-mono)" }}
          >
            {healthPercent}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <StatLine color="var(--nexus-ok)" label="תקינים" value={healthy} />
        {degraded > 0 && <StatLine color="var(--nexus-warn)" label="מוגבלים" value={degraded} />}
        {down > 0 && <StatLine color="var(--nexus-err)" label="נפלו" value={down} />}
        <div className="pt-1 border-t" style={{ borderColor: "var(--nexus-border)" }}>
          <StatLine color="var(--nexus-text-2)" label="סה״כ" value={total} />
        </div>
      </div>
    </div>
  );
}

function StatLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span style={{ color: "var(--nexus-text-2)" }}>{label}</span>
      <span className="font-bold" style={{ color: "var(--nexus-text-1)", fontFamily: "var(--nexus-font-mono)" }}>
        {value}
      </span>
    </div>
  );
}
