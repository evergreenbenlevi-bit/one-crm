import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  // Strip id from updates if present
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, ...updates } = body;

  const { data, error } = await supabase
    .from("content_pieces")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("content_pieces")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
