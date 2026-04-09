// Kairos-lite: Event-driven handler for CRM changes
// Triggered by Supabase database webhooks on INSERT/UPDATE
// Evaluates event → decides action → notifies via Telegram

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

// Event rules: what triggers an immediate notification
const EVENT_RULES: Array<{
  table: string;
  condition: (payload: WebhookPayload) => boolean;
  message: (payload: WebhookPayload) => string;
  priority: "urgent" | "important" | "info";
}> = [
  // New lead/customer
  {
    table: "customers",
    condition: (p) => p.type === "INSERT",
    message: (p) => `👤 ליד חדש: ${p.record.full_name || p.record.email || "unknown"}`,
    priority: "urgent",
  },
  // Task marked urgent or needle_mover
  {
    table: "tasks",
    condition: (p) =>
      p.type === "INSERT" && p.record.impact === "needle_mover",
    message: (p) => `🎯 משימת needle_mover חדשה: ${p.record.title}`,
    priority: "urgent",
  },
  // Task status changed to waiting (blocked)
  {
    table: "tasks",
    condition: (p) =>
      p.type === "UPDATE" &&
      p.record.status === "waiting" &&
      p.old_record?.status !== "waiting",
    message: (p) => `⏸️ משימה נתקעה (waiting): ${p.record.title}`,
    priority: "important",
  },
  // Task overdue (due_date passed, not done)
  {
    table: "tasks",
    condition: (p) => {
      if (p.type !== "UPDATE" || p.record.status === "done") return false;
      const due = p.record.due_date as string;
      if (!due) return false;
      return new Date(due) < new Date();
    },
    message: (p) => `🔴 משימה באיחור: ${p.record.title} (due: ${p.record.due_date})`,
    priority: "urgent",
  },
  // New content idea
  {
    table: "content_ideas",
    condition: (p) => p.type === "INSERT",
    message: (p) => `💡 רעיון תוכן חדש: ${p.record.title || p.record.topic || "untitled"}`,
    priority: "info",
  },
  // Application/form submission
  {
    table: "applications",
    condition: (p) => p.type === "INSERT",
    message: (p) => `📋 טופס חדש: ${p.record.full_name || p.record.email || "unknown"}`,
    priority: "urgent",
  },
];

async function sendTelegram(text: string, priority: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing Telegram config");
    return;
  }

  const prefix = priority === "urgent" ? "🚨" : priority === "important" ? "⚡" : "📌";
  const fullText = `${prefix} KAIROS EVENT\n\n${text}\n\n🕐 ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: fullText,
      parse_mode: "HTML",
    }),
  });
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log(`Event: ${payload.type} on ${payload.table}`);

    let matched = false;
    for (const rule of EVENT_RULES) {
      if (rule.table === payload.table && rule.condition(payload)) {
        const msg = rule.message(payload);
        console.log(`Rule matched [${rule.priority}]: ${msg}`);
        await sendTelegram(msg, rule.priority);
        matched = true;
        break; // first match wins
      }
    }

    if (!matched) {
      console.log(`No rule matched for ${payload.type} on ${payload.table}`);
    }

    return new Response(JSON.stringify({ ok: true, matched }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
