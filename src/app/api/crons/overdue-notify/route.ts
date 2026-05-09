export const runtime = "edge";
export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCronNotify } from "@/lib/cron-notify";

async function sendTelegram(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function _handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json({ error: "Telegram env vars missing" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,priority,priority_score,due_date,impact")
    .not("status", "in", '("done")')
    .is("archived_at", null)
    .lt("due_date", today)
    .not("due_date", "is", null)
    .order("priority_score", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const overdue = tasks ?? [];
  if (overdue.length === 0) return NextResponse.json({ sent: false, count: 0 });

  const hebDate = new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  const lines = [
    `<b>⚠️ משימות פגות תוקף — ${hebDate}</b>`,
    `${overdue.length} משימות:`,
    "",
    ...overdue.map((t) => `• ${t.title} (דדליין: ${t.due_date})`),
  ];

  await sendTelegram(token, chatId, lines.join("\n"));
  return NextResponse.json({ sent: true, count: overdue.length });
}

export const GET = withCronNotify("overdue-notify", _handler);
