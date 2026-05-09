import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const format = searchParams.get("format");
  const sort = searchParams.get("sort");
  const order = searchParams.get("order");

  const VALID_SORT_FIELDS = ["viral_score", "views", "saves", "publish_date", "created_at"];
  const sortField = sort && VALID_SORT_FIELDS.includes(sort) ? sort : "created_at";
  const ascending = order === "asc";

  let query = supabase
    .from("content_pieces")
    .select("*")
    .order(sortField, { ascending });

  if (status && status !== "all") query = query.eq("status", status);
  if (platform && platform !== "all") query = query.eq("platform", platform);
  if (format && format !== "all") query = query.eq("format", format);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const body = await request.json();

  // .insert() is correct here — UUID PK ensures no conflict on POST (always new record)
  const { data, error } = await supabase
    .from("content_pieces")
    .insert({
      title: body.title,
      hook: body.hook ?? null,
      angle: body.angle ?? null,
      format: body.format ?? null,
      platform: body.platform ?? "instagram",
      pillar: body.pillar ?? null,
      status: body.status ?? "idea",
      film_date: body.film_date ?? null,
      publish_date: body.publish_date ?? null,
      script: body.script ?? null,
      reference_urls: body.reference_urls ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
