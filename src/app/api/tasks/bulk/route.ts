import { NextRequest, NextResponse } from "next/server";
import { isLocalMode, bulkCreateTasks } from "@/lib/tasks-store";

// POST /api/tasks/bulk — import multiple tasks
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!Array.isArray(body.tasks)) {
    return NextResponse.json({ error: "tasks array is required" }, { status: 400 });
  }

  if (isLocalMode) {
    const created = bulkCreateTasks(body.tasks);
    return NextResponse.json({ imported: created.length, tasks: created }, { status: 201 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tasks").insert(body.tasks).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length || 0, tasks: data }, { status: 201 });
}
