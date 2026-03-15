import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  const product = searchParams.get("product");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  if (product) query = query.eq("product", product);
  if (status) query = query.eq("current_status", status);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
