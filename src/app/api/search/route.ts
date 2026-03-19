import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ leads: [], customers: [] });

  const supabase = await createClient();

  const [leadsRes, customersRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, email, phone, current_status, program")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),
    supabase
      .from("customers")
      .select("id, name, email, phone, status")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),
  ]);

  return NextResponse.json({
    leads: leadsRes.data || [],
    customers: customersRes.data || [],
  });
}
