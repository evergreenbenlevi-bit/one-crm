import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

const CUSTOMER_LIST_FIELDS = "id,name,email,phone,occupation,status,program,total_paid,payment_status,program_start_date,program_end_date,created_at";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("customers").select(CUSTOMER_LIST_FIELDS).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "שם הוא שדה חובה" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      occupation: body.occupation?.trim() || null,
      program: body.program || "one_vip",
      status: "active",
      total_paid: Number(body.total_paid) || 0,
      payment_status: "completed",
      program_start_date: body.program_start_date || new Date().toISOString(),
      current_month: 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
