import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["draft", "sent", "viewed", "signed", "rejected"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  let query = supabase
    .from("proposals")
    .select("*, leads(name, email, phone), customers(name, email)")
    .order("created_at", { ascending: false });

  const status = searchParams.get("status");
  const lead_id = searchParams.get("lead_id");
  const customer_id = searchParams.get("customer_id");

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
    query = query.eq("status", status);
  }

  if (lead_id) query = query.eq("lead_id", lead_id);
  if (customer_id) query = query.eq("customer_id", customer_id);

  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      lead_id: body.lead_id || null,
      customer_id: body.customer_id || null,
      title: body.title,
      program: body.program || null,
      amount: body.amount || null,
      payment_structure: body.payment_structure || null,
      status: "draft",
      file_path: body.file_path || null,
      notes: body.notes || null,
      expires_at: body.expires_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
