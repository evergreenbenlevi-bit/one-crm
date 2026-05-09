import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { name, subject, body: templateBody, category } = body;

  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: "name, subject, body required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ name, subject, body: templateBody, category: category ?? "general" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
