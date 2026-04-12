export const runtime = "edge";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_calls")
    .select("*, customers(name)")
    .order("call_date", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  if (!body.call_date || !body.topic) {
    return NextResponse.json({ error: "call_date ו-topic הם שדות חובה" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("service_calls")
    .insert({
      customer_id: body.customer_id || null,
      call_date: body.call_date,
      topic: body.topic,
      response_time_hours: body.response_time_hours != null ? Number(body.response_time_hours) : null,
      satisfaction_rating: body.satisfaction_rating != null ? Number(body.satisfaction_rating) : null,
      nps_score: body.nps_score != null ? Number(body.nps_score) : null,
      notes: body.notes || null,
      resolved: body.resolved ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();
  const { id, resolved } = body;

  if (!id) return NextResponse.json({ error: "id הוא שדה חובה" }, { status: 400 });

  const { data, error } = await supabase
    .from("service_calls")
    .update({ resolved })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
