"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";

interface NexusCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  onClick?: () => void;
  as?: "div" | "a";
  href?: string;
}

export function NexusCard({
  children,
  className,
  glow = false,
  hover = true,
  onClick,
}: NexusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={clsx(
        "nexus-card p-4",
        glow && "nexus-card-glow",
        hover && "cursor-pointer hover:border-[rgba(255,255,255,0.15)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
