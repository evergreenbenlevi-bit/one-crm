const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "7887227045";

async function sendTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — skipping notification");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to send notification:", err);
  }
}

export function notifyNewLead(name: string, source: string, stage: string): void {
  const msg = `🔔 ליד חדש: ${name} | ${source} | ${stage}`;
  sendTelegram(msg);
}

export function notifyNewPayment(name: string, amount: number, product: string): void {
  const msg = `💰 תשלום חדש: ${name} | ₪${amount.toLocaleString()} | ${product}`;
  sendTelegram(msg);
}
