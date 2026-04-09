import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/receipts?from=&to=&sent=true|false
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sent = searchParams.get("sent"); // "true" | "false"

  const supabase = createAdminClient();
  let query = supabase
    .from("receipts")
    .select("*, expenses(id, description, category, amount, date)")
    .order("receipt_date", { ascending: false });

  if (from) query = query.gte("receipt_date", from);
  if (to) query = query.lte("receipt_date", to);
  if (sent === "true") query = query.eq("sent_to_accountant", true);
  if (sent === "false") query = query.eq("sent_to_accountant", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/receipts
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.vendor) {
    return NextResponse.json({ error: "vendor is required" }, { status: 400 });
  }
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("receipts")
    .insert({
      expense_id: body.expense_id || null,
      source_email_id: body.source_email_id || null,
      vendor: body.vendor,
      amount: body.amount,
      receipt_date: body.receipt_date || new Date().toISOString().split("T")[0],
      file_url: body.file_url || null,
      sent_to_accountant: body.sent_to_accountant || false,
      sent_date: body.sent_date || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/receipts?id=<uuid>
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await request.json();

  // Whitelist allowed fields
  const allowed = ["vendor", "amount", "receipt_date", "file_url", "sent_to_accountant", "sent_date", "notes", "expense_id", "source_email_id"];
  const sanitized = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("receipts")
    .update(sanitized)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
