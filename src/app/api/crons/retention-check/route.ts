export const runtime = "edge";

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { withCronNotify } from "@/lib/cron-notify";

async function sendTelegram(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function _handler(request: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramToken || !chatId) {
    return NextResponse.json({ error: "Telegram env vars missing" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, program_end_date, satisfaction_rating, upsell_status")
    .eq("status", "active")
    .not("program_end_date", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts: string[] = [];
  const MILESTONES = [30, 14, 7];

  for (const customer of customers ?? []) {
    const endDate = new Date(customer.program_end_date);
    endDate.setHours(0, 0, 0, 0);

    const diffMs = endDate.getTime() - today.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Ended already
    if (daysRemaining < 0) {
      const daysPast = Math.abs(daysRemaining);
      if (daysPast === 1 || daysPast === 3 || daysPast === 7) {
        // Only alert on days 1, 3, 7 after end to avoid daily spam
        const msg = `⏰ ${customer.name} — סיים את התוכנית לפני ${daysPast} ימים — האם המשיך?`;
        alerts.push(msg);
      }
      continue;
    }

    // Approaching end — check ±1 day tolerance
    for (const milestone of MILESTONES) {
      if (Math.abs(daysRemaining - milestone) <= 1) {
        const rating = customer.satisfaction_rating ? `${customer.satisfaction_rating}/10` : "לא דורג";
        const msg = `⚠️ ${customer.name} — ${daysRemaining} ימים לסיום התוכנית\nשביעות רצון: ${rating}\nהמלצה: שלח הצעת upsell`;
        alerts.push(msg);
        break;
      }
    }
  }

  if (alerts.length > 0) {
    for (const msg of alerts) {
      await sendTelegram(telegramToken, chatId, msg);
    }
  }

  return NextResponse.json({
    checked: customers?.length ?? 0,
    alerts_sent: alerts.length,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withCronNotify("retention-check", _handler);
