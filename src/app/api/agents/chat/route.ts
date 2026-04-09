import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { readFile } from "fs/promises";
import { join } from "path";

export const preferredRegion = ["fra1", "arn1", "cdg1"];
export const maxDuration = 60;

const AGENTS_DIR = join(process.env.HOME || "/Users/benlevi", ".claude/agents");

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { messages, agentSlug } = body;

  if (!agentSlug || !messages) {
    return new Response(JSON.stringify({ error: "Missing agentSlug or messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Try to load agent .md file for system prompt
  let systemPrompt = `You are ${agentSlug}, an AI agent. Respond helpfully in Hebrew when appropriate.`;
  try {
    const mdPath = join(AGENTS_DIR, `${agentSlug}.md`);
    const content = await readFile(mdPath, "utf-8");
    systemPrompt = content.slice(0, 2000);
  } catch {
    // Agent file not found — use default prompt
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
