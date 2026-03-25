import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// PATCH /api/big3/tasks/[id]/complete
// Body: { completed: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await request.json();
  const completed = Boolean(body.completed);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("big3_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
