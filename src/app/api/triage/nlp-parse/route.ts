import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BRAIN_DUMP_THRESHOLD = 120;

interface NLPResult {
  due_date?: string | null;
  due_time?: string | null;
  estimated_minutes?: 5 | 15 | 30 | 45 | 60 | 90 | 120 | null;
  owner?: "claude" | "ben" | "both" | "avitar" | null;
  impact?: "needle_mover" | "important" | "nice" | null;
  size?: "quick" | "medium" | "big" | null;
  category?: string | null;
  summary?: string;
  clean_description?: string | null;
  // Calendar integration fields
  calendar_event?: boolean | null;
  invite_person?: string | null;
  travel_minutes?: number | null;
}

// POST /api/triage/nlp-parse
// Body: { text: string; task_title?: string; task_description?: string }
// Returns: { parsed: NLPResult }
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const text = body?.text?.trim();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (text.length > 2000) {
    return NextResponse.json({ error: "text too long (max 2000 chars)" }, { status: 400 });
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][today.getDay()];

  const taskContext = body.task_title
    ? `\nTask being triaged: "${body.task_title}"${body.task_description ? ` — ${body.task_description}` : ""}`
    : "";

  // If user already set duration/impact manually, tell NLP not to override
  const manualFields = body.manual_fields as string[] | undefined;

  const isBrainDump = text.length > BRAIN_DUMP_THRESHOLD;
  const model = isBrainDump ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";

  const brainDumpInstruction = isBrainDump
    ? `\n\nBRAIN DUMP MODE: The input is a long free-form note. Do your best to extract any scheduling fields you can find. Additionally, return a "clean_description" field: rewrite the input as an organized, clear Hebrew description (up to 200 words). Structure it with bullet points if multiple items are mentioned. This is NOT the summary — summary stays short (max 15 words). clean_description is the full organized version of what the user wrote.`
    : "";

  const message = await client.messages.create({
    model,
    max_tokens: isBrainDump ? 1024 : 512,
    messages: [
      {
        role: "user",
        content: `Today is ${todayStr} (${dayOfWeek}). Parse this Hebrew/English triage input and extract scheduling fields.
${taskContext}

Input: "${text}"

Extract ONLY fields that are EXPLICITLY mentioned in the text. Do NOT guess or infer fields that aren't clearly stated.${manualFields?.length ? `\n\nIMPORTANT: The user already manually set these fields: ${manualFields.join(", ")}. Do NOT return values for these fields — set them to null.` : ""}${brainDumpInstruction}

Fields to look for:

- due_date: YYYY-MM-DD format. Parse relative dates:
  "היום"/"today" = ${todayStr}
  "מחר"/"tomorrow" = next day
  "מחרתיים" = 2 days
  "השבוע"/"this week" = next available weekday
  "ראשון"/"שני"/"שלישי" etc = next occurrence of that day
  "עוד שבוע"/"next week" = +7 days
  "עוד חודש" = +30 days

- due_time: HH:MM (24h). Parse: "בבוקר"=09:00, "בצהריים"=12:00, "אחה״צ"=15:00, "בערב"=20:00, "בלילה"=23:00, or specific times like "ב-14:00"

- estimated_minutes: Must be one of: 5, 15, 30, 45, 60, 90, 120. Parse:
  "5 דקות"/"מהיר" = 5
  "רבע שעה"/"15 דקות" = 15
  "חצי שעה"/"30 דקות" = 30
  "45 דקות"/"שלושת רבעי שעה" = 45
  "שעה" = 60
  "שעה וחצי" = 90
  "שעתיים" = 120
  Round to nearest valid value.

- owner: "ben"/"claude"/"avitar"/"both". Parse:
  "אני"/"שלי"/"בן" = ben
  "Claude"/"קלוד"/"AI" = claude
  "אביתר" = avitar
  "ביחד"/"שנינו" = both

- impact: "needle_mover"/"important"/"nice". Parse:
  "דחוף"/"קריטי"/"חשוב מאוד"/"needle mover" = needle_mover
  "חשוב"/"צריך" = important
  "נחמד"/"אם יש זמן"/"לא דחוף" = nice

- size: "quick"/"medium"/"big". Parse:
  "קטן"/"מהיר"/"קצר" = quick
  "בינוני"/"רגיל" = medium
  "גדול"/"מורכב"/"פרויקט" = big

- category: one of "one_tm","brand","research","self","personal","errands","infrastructure". Parse from context.

- summary: Very short Hebrew summary of what you understood (max 15 words).
${isBrainDump ? '\n- clean_description: Organized Hebrew rewrite of the full input (up to 200 words). Use bullet points if multiple items.' : ''}
- calendar_event: true if this task should be a calendar event (has specific time/date with a meeting, appointment, or time-blocked work). false/null for simple tasks.

- invite_person: Name of person to invite to the calendar event. Parse:
  "תזמין את אביתר"/"עם אביתר" = "avitar"
  "פגישה עם X" = the person's name
  null if no invitee mentioned.

- travel_minutes: Travel time in minutes if mentioned separately. Parse:
  "15 דקות נסיעה + 25 דקות עבודה" = 15 (and estimated_minutes = 25)
  "נסיעה חצי שעה" = 30
  "כולל נסיעה 20 דק" = 20
  null if no travel mentioned.
  When travel is mentioned, estimated_minutes should be the WORK time only, not including travel.

Return ONLY valid JSON object, no explanation:
{"due_date":null,"due_time":null,"estimated_minutes":null,"owner":null,"impact":null,"size":null,"category":null,"summary":"..."${isBrainDump ? ',"clean_description":"..."' : ''},"calendar_event":null,"invite_person":null,"travel_minutes":null}

Omit fields you can't determine (set to null). Always include summary.${isBrainDump ? ' Always include clean_description.' : ''}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    // Fallback: never lose input
    return NextResponse.json({
      parsed: {
        summary: text.slice(0, 60) + (text.length > 60 ? "..." : ""),
        clean_description: isBrainDump ? text : null,
      },
    });
  }

  try {
    // Layer 1: Standard JSON regex extraction
    let jsonMatch = content.text.match(/\{[\s\S]*\}/);

    // Layer 2: Relaxed JSON fix (trailing commas, unescaped newlines)
    if (!jsonMatch) {
      const cleaned = content.text
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/\n/g, " ");
      jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    }

    // Layer 3: If all parsing fails, return raw text as description (never lose input)
    if (!jsonMatch) {
      return NextResponse.json({
        parsed: {
          summary: text.slice(0, 60) + (text.length > 60 ? "..." : ""),
          clean_description: isBrainDump ? text : null,
        },
      });
    }

    const parsed: NLPResult = JSON.parse(jsonMatch[0]);

    // Server-side strip: forcefully remove fields the user already set manually
    // Haiku sometimes ignores the prompt instruction — this is the hard guarantee
    if (manualFields?.length) {
      for (const field of manualFields) {
        if (field in parsed) {
          (parsed as Record<string, unknown>)[field] = null;
        }
      }
    }

    // Validate estimated_minutes is a valid value
    const validMinutes = [5, 15, 30, 45, 60, 90, 120];
    if (parsed.estimated_minutes && !validMinutes.includes(parsed.estimated_minutes)) {
      parsed.estimated_minutes = null;
    }

    // Validate owner
    const validOwners = ["claude", "ben", "both", "avitar"];
    if (parsed.owner && !validOwners.includes(parsed.owner)) {
      parsed.owner = null;
    }

    // Validate impact
    const validImpact = ["needle_mover", "important", "nice"];
    if (parsed.impact && !validImpact.includes(parsed.impact)) {
      parsed.impact = null;
    }

    // Validate size
    const validSize = ["quick", "medium", "big"];
    if (parsed.size && !validSize.includes(parsed.size)) {
      parsed.size = null;
    }

    // Validate category
    const validCategories = ["one_tm", "brand", "research", "self", "personal", "errands", "infrastructure"];
    if (parsed.category && !validCategories.includes(parsed.category)) {
      parsed.category = null;
    }

    // Validate calendar fields
    if (parsed.calendar_event && typeof parsed.calendar_event !== "boolean") {
      // Sonnet sometimes returns a string instead of boolean — coerce truthy values
      parsed.calendar_event = parsed.calendar_event === true || parsed.calendar_event === "true" ? true : null;
    }

    if (parsed.travel_minutes && (typeof parsed.travel_minutes !== "number" || parsed.travel_minutes < 0 || parsed.travel_minutes > 180)) {
      parsed.travel_minutes = null;
    }

    // Auto-detect calendar_event: if there's a specific date+time, it's a calendar event
    if (!parsed.calendar_event && parsed.due_date && parsed.due_time) {
      parsed.calendar_event = true;
    }

    return NextResponse.json({ parsed });
  } catch {
    // Final fallback: even JSON.parse failure doesn't lose input
    return NextResponse.json({
      parsed: {
        summary: text.slice(0, 60) + (text.length > 60 ? "..." : ""),
        clean_description: isBrainDump ? text : null,
      },
    });
  }
}
