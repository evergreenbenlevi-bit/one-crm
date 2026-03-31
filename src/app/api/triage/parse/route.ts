import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/triage/parse
// Body: { text: string; tasks: Array<{ id: string; title: string }> }
// Returns: { updates: Array<{ id: string; title: string; layer: string }> }
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, tasks } = await request.json();
  if (!text || !tasks?.length) {
    return NextResponse.json({ error: "text and tasks required" }, { status: 400 });
  }

  const taskList = tasks
    .map((t: { id: string; title: string }) => `- id: ${t.id} | title: ${t.title}`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a task triage assistant. Given a brain dump in Hebrew or English and a list of tasks, return a JSON array of updates.

Layer values: quick_win (≤5 min action), low_priority (defer to Saturday review), project (ongoing work, high importance), deleted (remove entirely).

Brain dump:
${text}

Task list:
${taskList}

Return ONLY valid JSON array, no explanation:
[{"id": "...", "title": "...", "layer": "quick_win|low_priority|project|deleted"}, ...]

Only include tasks explicitly mentioned in the brain dump. If a task is not mentioned, do not include it.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ updates: [] });
    const updates = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ updates });
  } catch {
    return NextResponse.json({ error: "Parse error", raw: content.text }, { status: 500 });
  }
}
