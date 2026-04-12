export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = req.nextUrl.searchParams.get("platform") || "youtube";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 50);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ben_performance_snapshots")
    .select("*")
    .eq("platform", platform)
    .order("publish_date", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const snapshots = data || [];
  const avgViews =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((s, v) => s + (v.views || 0), 0) / snapshots.length)
      : 0;

  return NextResponse.json({ snapshots, avgViews, platform, total: snapshots.length });
}
