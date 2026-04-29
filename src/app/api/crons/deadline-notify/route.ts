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

const PRIORITY_LABEL: Record<string, string> = {
  p0: "P0 — בוער",
  p1: "P1 — קריטי",
  p2: "P2 — חשוב",
  p3: "P3 — Nice to have",
};

const SLOT_LABEL: Record<string, string> = {
  morning: "בוקר",
  afternoon: "אחה\"צ",
  evening: "ערב",
  any: "",
};

async function _handler(request: NextRequest) {
  // Vercel cron auth
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
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,priority,priority_score,due_date,time_slot,estimated_minutes,impact")
    .not("status", "in", '("done")').is("archived_at", null)
    .or(`due_date.eq.${today},due_date.eq.${tomorrow}`)
    .is("archived_at", null)
    .order("priority_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allTasks = tasks ?? [];
  if (allTasks.length === 0) {
    await sendTelegram(token, chatId, "בוקר טוב — אין משימות ליום זה. יום פנוי!");
    return NextResponse.json({ sent: 0 });
  }

  const todayTasks = allTasks.filter((t) => t.due_date === today);
  const tomorrowTasks = allTasks.filter((t) => t.due_date === tomorrow);

  const hebDate = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const lines: string[] = [`<b>בוקר טוב — ${hebDate}</b>`, ""];

  if (todayTasks.length > 0) {
    lines.push(`<b>היום (${todayTasks.length})</b>`);
    for (const t of todayTasks) {
      const slot = t.time_slot && t.time_slot !== "any" ? ` [${SLOT_LABEL[t.time_slot] ?? t.time_slot}]` : "";
      const priority = t.priority ? ` • ${PRIORITY_LABEL[t.priority] ?? t.priority}` : "";
      const mins = t.estimated_minutes ? ` • ${t.estimated_minutes} דק׳` : "";
      lines.push(`• ${t.title}${slot}${priority}${mins}`);
    }
    lines.push("");
  }

  if (tomorrowTasks.length > 0) {
    lines.push(`<b>מחר (${tomorrowTasks.length})</b>`);
    for (const t of tomorrowTasks) {
      const slot = t.time_slot && t.time_slot !== "any" ? ` [${SLOT_LABEL[t.time_slot] ?? t.time_slot}]` : "";
      lines.push(`• ${t.title}${slot}`);
    }
  }

  await sendTelegram(token, chatId, lines.join("\n"));
  return NextResponse.json({ sent: allTasks.length, today: todayTasks.length, tomorrow: tomorrowTasks.length });
}

export const GET = withCronNotify("deadline-notify", _handler);
