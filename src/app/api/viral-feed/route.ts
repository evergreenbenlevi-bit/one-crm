import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const niche    = searchParams.get("niche");
  const platform = searchParams.get("platform");
  const week     = searchParams.get("week");
  const action   = searchParams.get("action") ?? "none"; // default: show unactioned
  const lifetime = searchParams.get("lifetime") === "true";
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let query = supabase
    .from("viral_scans")
    .select("*")
    .order("viral_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (niche)    query = query.eq("niche", niche);
  if (platform) query = query.eq("platform", platform);
  if (week)     query = query.eq("week", week);
  if (lifetime) query = query.eq("is_lifetime_top5", true);
  if (action !== "all") query = query.eq("ben_action", action);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
