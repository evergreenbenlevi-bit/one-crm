import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").select("*").order("year", { ascending: false }).order("quarter", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("goals").upsert(body, { onConflict: "quarter,year" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
