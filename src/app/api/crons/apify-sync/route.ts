/**
 * Apify Usage Sync — runs monthly (1st of each month, 07:00)
 * Pulls actual Apify usage for the previous month and writes to api_costs
 * vercel.json cron: { "path": "/api/crons/apify-sync", "schedule": "0 7 1 * *" }
 */
import { NextRequest, NextResponse } from "next/server";
export const preferredRegion = ["fra1"];
import { createAdminClient } from "@/lib/supabase/admin";

const CRON_SECRET = process.env.CRON_SECRET;
const APIFY_API_KEY = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APIFY_API_KEY) {
    return NextResponse.json({ error: "APIFY_API_KEY not set" }, { status: 500 });
  }

  // Previous month
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  try {
    // Apify Usage API — get monthly usage stats
    const res = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${APIFY_API_KEY}` },
    });

    if (!res.ok) throw new Error(`Apify API error: ${res.status}`);

    const user = await res.json();
    const plan = user?.data?.plan;
    const monthUsage = user?.data?.monthlyUsage;

    // Apify reports USD spend in monthlyUsage
    const costUsd = monthUsage?.totalCostUsd ?? 0;
    const runs = monthUsage?.actorRuns ?? 0;

    const supabase = createAdminClient();
    await supabase.from("api_costs").upsert(
      {
        service: "apify",
        period,
        units: runs,
        cost_usd: costUsd,
        notes: `Plan: ${plan?.id ?? "unknown"}. Auto-synced from Apify API.`,
        source: "api_sync",
        synced_at: new Date().toISOString(),
      },
      { onConflict: "service,period" }
    );

    return NextResponse.json({ ok: true, period, cost_usd: costUsd, runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
