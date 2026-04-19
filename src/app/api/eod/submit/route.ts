export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

interface TaskLog {
  id: string;
  actual_minutes?: number | null;
  action?: "done" | "carry" | "park" | "kill";
}

interface FitnessData {
  steps?: number | null;
  workout?: string | null;
  nutrition?: string | null;
  energy_score?: number | null;
}

const STATUS_MAP: Record<string, string> = {
  done: "done",
  carry: "up_next",
  park: "someday",
  kill: "archived",
};

async function sendTelegram(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { task_logs?: TaskLog[]; fitness?: FitnessData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { task_logs = [], fitness } = body;
  const supabase = createAdminClient();
  const errors: string[] = [];
  let updated = 0;

  // Update tasks
  for (const log of task_logs) {
    const patch: Record<string, unknown> = {};

    if (log.actual_minutes != null) {
      patch.actual_minutes = log.actual_minutes;
    }
    if (log.action) {
      patch.status = STATUS_MAP[log.action] ?? "up_next";
      if (log.action === "done") {
        patch.completed_at = new Date().toISOString();
      }
      if (log.action === "kill") {
        patch.archived_at = new Date().toISOString();
        patch.archive_reason = "killed at EOD";
      }
    }

    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase.from("tasks").update(patch).eq("id", log.id);
    if (error) {
      errors.push(`${log.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  // Route fitness to Mike via Telegram
  if (fitness && Object.values(fitness).some((v) => v != null)) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const today = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
      const lines: string[] = [`<b>EOD — ${today}</b>`, ""];

      if (fitness.steps != null) lines.push(`צעדים: ${fitness.steps.toLocaleString()}`);
      if (fitness.workout) lines.push(`אימון: ${fitness.workout}`);
      if (fitness.nutrition) lines.push(`תזונה: ${fitness.nutrition}`);
      if (fitness.energy_score != null) lines.push(`אנרגיה: ${fitness.energy_score}/10`);

      lines.push("", "@MIKE — EOD data above, please log and comment.");

      await sendTelegram(token, chatId, lines.join("\n")).catch(() => {});
    }
  }

  return NextResponse.json({
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
