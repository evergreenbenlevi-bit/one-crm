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
        content: `You are a task triage assistant. Given a brain dump in Hebrew or English and a list of tasks, classify each mentioned task by EFFORT (how long it takes) and optionally suggest PRIORITY changes.

Effort values:
- quick: Takes ≤5 minutes (a quick action, not a project)
- small: Takes up to 1 hour
- medium: Takes up to a full day
- large: Multi-day project, requires planning

Priority values:
- p1: Critical — directly moves business/life forward
- p2: Important — should be done this week
- p3: Nice to have — can wait

Brain dump:
${text}

Task list:
${taskList}

Return ONLY valid JSON array, no explanation:
[{"id": "...", "title": "...", "effort": "quick|small|medium|large", "priority": "p1|p2|p3"}, ...]

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
