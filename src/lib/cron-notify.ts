import { NextRequest, NextResponse } from "next/server";

type Handler = (req: NextRequest) => Promise<NextResponse>;

export function withCronNotify(name: string, handler: Handler): Handler {
  return async (req: NextRequest) => {
    try {
      const response = await handler(req);
      const isError = response.status >= 400;
      const body = await response.clone().json().catch(() => ({}));
      await notifyCronResult(name, !isError, isError ? JSON.stringify(body).slice(0, 200) : "completed");
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await notifyCronResult(name, false, msg.slice(0, 200));
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export async function notifyCronResult(
  cronName: string,
  success: boolean,
  details: string,
  stats?: Record<string, number>
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const icon = success ? "[OK]" : "[FAIL]";
  const statsLine = stats
    ? Object.entries(stats)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")
    : "";
  const text = `${icon} ${cronName}\n${details}${statsLine ? "\n" + statsLine : ""}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {}); // never block the cron
}
