import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  return data?.role === "admin";
}

// GET /api/tasks/[id]/reminders
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_reminders")
    .select("*")
    .eq("task_id", id)
    .order("remind_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tasks/[id]/reminders
// Body: { remind_at: ISO string, message?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  if (!body.remind_at) return NextResponse.json({ error: "remind_at required" }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_reminders")
    .insert([{ task_id: id, remind_at: body.remind_at, message: body.message || null }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/tasks/[id]/reminders?reminder_id=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await params;
  const reminderId = new URL(request.url).searchParams.get("reminder_id");
  if (!reminderId) return NextResponse.json({ error: "reminder_id required" }, { status: 400 });
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_reminders").delete().eq("id", reminderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
