import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const sortBy = searchParams.get("sort_by") || "published_at";
  // Note: post_date was renamed to published_at in 20260325_content_ideas migration
  const sortDir = searchParams.get("sort_dir") === "asc" ? true : false;

  let query = supabase
    .from("content_metrics")
    .select("*")
    .order(sortBy, { ascending: sortDir });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase.from("content_metrics").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
