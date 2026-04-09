"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { NexusStatusDot } from "../ui/nexus-status-dot";
import { NexusBadge } from "../ui/nexus-badge";
import type { TopologyNode } from "@/lib/types/agents";

interface Props {
  agent: TopologyNode | null;
  onClose: () => void;
}

export function AgentDetailPanel({ agent, onClose }: Props) {
  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute top-0 left-0 h-full w-[320px] z-30 nexus-scroll overflow-y-auto"
          style={{
            background: "var(--nexus-bg-card)",
            borderRight: "1px solid var(--nexus-border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: "var(--nexus-border)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <NexusStatusDot status={agent.status} size="md" />
              <h3
                className="text-base font-bold truncate"
                style={{ color: "var(--nexus-text-1)" }}
              >
                {agent.label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
              style={{ color: "var(--nexus-text-2)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Details */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <NexusBadge type={agent.type} />
              {agent.model && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--nexus-text-2)",
                    fontFamily: "var(--nexus-font-mono)",
                  }}
                >
                  {agent.model}
                </span>
              )}
            </div>

            {/* Status section */}
            <div className="nexus-card p-3 space-y-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--nexus-text-2)" }}
              >
                סטטוס
              </p>
              <NexusStatusDot status={agent.status} showLabel />
            </div>

            {/* Cost */}
            {agent.costToday !== undefined && agent.costToday > 0 && (
              <div className="nexus-card p-3 space-y-2">
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--nexus-text-2)" }}
                >
                  עלות היום
                </p>
                <p
                  className="text-lg font-bold"
                  style={{
                    color: "var(--nexus-accent)",
                    fontFamily: "var(--nexus-font-mono)",
                  }}
                >
                  ${agent.costToday.toFixed(2)}
                </p>
              </div>
            )}

            {/* Quick link */}
            <a
              href={`/agents/registry/${agent.id}`}
              className="block text-center text-sm py-2 rounded-xl transition-colors"
              style={{
                background: "var(--nexus-accent-glow)",
                color: "var(--nexus-accent)",
              }}
            >
              פרופיל מלא →
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
