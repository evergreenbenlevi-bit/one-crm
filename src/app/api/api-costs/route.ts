import { NextRequest, NextResponse } from "next/server";
export const preferredRegion = ["fra1"];
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period"); // YYYY-MM, optional

  let query = supabase
    .from("api_costs")
    .select("*")
    .order("period", { ascending: false });

  if (period) query = query.eq("period", period);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await req.json();
  const { service, period, units, cost_usd, notes } = body;

  if (!service || !period || cost_usd === undefined) {
    return NextResponse.json({ error: "service, period, cost_usd required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("api_costs")
    .upsert({ service, period, units, cost_usd, notes, source: "manual" }, { onConflict: "service,period" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await req.json();
  const { id, cost_usd, units, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates = Object.fromEntries(
    Object.entries({ cost_usd, units, notes }).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from("api_costs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
