import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["draft", "sent", "viewed", "signed", "rejected"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select("*, leads(name, email, phone), customers(name, email)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Auto-timestamp status transitions
  if (body.status && VALID_STATUSES.includes(body.status)) {
    const now = new Date().toISOString();
    if (body.status === "sent" && !body.sent_at) body.sent_at = now;
    if (body.status === "viewed" && !body.viewed_at) body.viewed_at = now;
    if (body.status === "signed" && !body.signed_at) body.signed_at = now;
    if (body.status === "rejected" && !body.rejected_at) body.rejected_at = now;

    // Set expiry 14 days from send if not already set
    if (body.status === "sent" && !body.expires_at) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      body.expires_at = expiry.toISOString();
    }
  }

  const { data, error } = await supabase
    .from("proposals")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
