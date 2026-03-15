import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  let query = supabase.from("meetings").select("*, customers(name)").order("date", { ascending: true });

  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("meetings").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
