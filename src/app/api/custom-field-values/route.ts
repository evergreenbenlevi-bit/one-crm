import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/custom-field-values?entity_id=<uuid>
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get("entity_id");

  if (!entityId) return NextResponse.json({ error: "entity_id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("custom_field_values")
    .select("*, custom_fields(*)")
    .eq("entity_id", entityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/custom-field-values — upsert
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.field_id || !body.entity_id) {
    return NextResponse.json({ error: "field_id and entity_id are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("custom_field_values")
    .upsert(
      {
        field_id: body.field_id,
        entity_id: body.entity_id,
        value: body.value ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "field_id,entity_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
