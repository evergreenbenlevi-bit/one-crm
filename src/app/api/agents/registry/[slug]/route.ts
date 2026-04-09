import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/registry/[slug]
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("agent_registry")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/agents/registry/[slug]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("agent_registry")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/agents/registry/[slug]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase.from("agent_registry").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
