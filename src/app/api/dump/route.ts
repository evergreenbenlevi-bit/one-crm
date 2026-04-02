import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VAULT_BASE =
  "/Users/benlevi/Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN/08_TASKS";
const VAULT_IDEAS_PATH = join(VAULT_BASE, "IDEAS");
const VAULT_DUMPS_PATH = join(VAULT_BASE, "BRAIN-DUMPS");

type DumpType = "task" | "idea" | "reminder" | "note" | "system";

interface ClassifiedItem {
  text: string;
  type: DumpType;
  title: string;
  due_date: string | null;
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = body?.text?.trim();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (text.length > 10000) {
    return NextResponse.json({ error: "text too long (max 10000 chars)" }, { status: 400 });
  }

  // ── Classify with Claude ──
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date().toISOString().split("T")[0];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Classify each item in the following brain dump. For each item return JSON:
{ "items": [{ "text": "original text", "type": "task|idea|reminder|note|system", "title": "short title in the same language as the text", "due_date": "YYYY-MM-DD or null" }] }

Rules:
- "task" = something actionable that needs to be done
- "reminder" = time-sensitive action (has a deadline or time reference like "tomorrow", "next week", "Sunday")
- "idea" = creative thought, concept, or possibility to explore
- "note" = observation, fact, or reference to remember
- "system" = something about Claude/AI/automation system setup
- For reminders, parse relative dates based on today (${today})
- Return ONLY valid JSON, no markdown fences

Brain dump:
${text}`,
      },
    ],
  });

  let items: ClassifiedItem[] = [];
  try {
    const content = message.content[0];
    if (content.type === "text") {
      const parsed = JSON.parse(content.text);
      items = parsed.items ?? [];
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Claude response" },
      { status: 500 }
    );
  }

  // ── Route each item ──
  const supabase = createAdminClient();
  const results: { text: string; type: string; title: string; destination: string; due_date: string | null }[] = [];

  const vaultItems: ClassifiedItem[] = [];
  const crmItems: ClassifiedItem[] = [];

  for (const item of items) {
    if (item.type === "task" || item.type === "reminder") {
      crmItems.push(item);
    } else {
      vaultItems.push(item);
    }
  }

  // ── Create CRM tasks ──
  for (const item of crmItems) {
    const { error } = await supabase.from("tasks").insert({
      title: item.title,
      description: item.text,
      priority: "p2",
      status: "todo",
      owner: "ben",
      category: "self",
      due_date: item.due_date || null,
      tags: ["brain-dump"],
      source: "brain-dump",
    });

    const destination =
      item.type === "reminder" && item.due_date
        ? `CRM + ${item.due_date}`
        : "CRM";

    results.push({
      text: item.text,
      type: item.type,
      title: item.title,
      destination: error ? `CRM (error: ${error.message})` : destination,
      due_date: item.due_date,
    });
  }

  // ── Save ideas/notes/system to vault (with Supabase fallback for prod) ──
  for (const item of vaultItems) {
    let savedToVault = false;
    try {
      const targetDir = item.type === "idea" ? VAULT_IDEAS_PATH : VAULT_DUMPS_PATH;
      await mkdir(targetDir, { recursive: true });

      const slug = item.title.slice(0, 30).replace(/[\s/\\]/g, "-");
      const filename = `${today}-${slug}.md`;
      const filepath = join(targetDir, filename);

      const icon = item.type === "idea" ? "💡" : item.type === "system" ? "⚙️" : "📝";
      const content = [
        "---",
        "source: brain-dump",
        `date: ${today}`,
        `category: ${item.type}`,
        "---",
        "",
        `# ${icon} ${item.title}`,
        "",
        item.text,
        "",
      ].join("\n");

      await writeFile(filepath, content, "utf-8");
      savedToVault = true;

      results.push({
        text: item.text,
        type: item.type,
        title: item.title,
        destination: "vault",
        due_date: item.due_date,
      });
    } catch {
      // Vault write failed (e.g., running on Vercel) — save as CRM task instead
      const { error: fbError } = await supabase.from("tasks").insert({
        title: item.title,
        description: item.text,
        priority: "p3",
        status: "backlog",
        owner: "ben",
        category: "personal",
        due_date: item.due_date || null,
        tags: ["brain-dump", item.type],
        source: "brain-dump",
      });

      results.push({
        text: item.text,
        type: item.type,
        title: item.title,
        destination: fbError ? `fallback error: ${fbError.message}` : "CRM (vault unavailable)",
        due_date: item.due_date,
      });
    }
  }

  return NextResponse.json({ items: results, count: results.length });
}
