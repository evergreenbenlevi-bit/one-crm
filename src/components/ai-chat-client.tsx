"use client";

import dynamic from "next/dynamic";

const AIChat = dynamic(
  () => import("@/components/ai-chat").then((m) => ({ default: m.AIChat })),
  { ssr: false }
);

export function AIChatClient() {
  return <AIChat />;
}
