import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_ENTITY_TYPES = ["lead", "expense", "task"];
const VALID_FIELD_TYPES = ["text", "number", "select", "date", "boolean"];

// GET /api/custom-fields?entity_type=lead
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entity_type");

  const supabase = createAdminClient();
  let query = supabase
    .from("custom_fields")
    .select("*")
    .order("sort_order", { ascending: true });

  if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/custom-fields
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.entity_type || !VALID_ENTITY_TYPES.includes(body.entity_type)) {
    return NextResponse.json({ error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!body.field_name || !body.field_label) {
    return NextResponse.json({ error: "field_name and field_label are required" }, { status: 400 });
  }
  if (!body.field_type || !VALID_FIELD_TYPES.includes(body.field_type)) {
    return NextResponse.json({ error: `field_type must be one of: ${VALID_FIELD_TYPES.join(", ")}` }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("custom_fields")
    .insert({
      entity_type: body.entity_type,
      field_name: body.field_name,
      field_label: body.field_label,
      field_type: body.field_type,
      options_json: body.options_json || null,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
