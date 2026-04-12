export const runtime = "edge";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, program_end_date, satisfaction_rating, upsell_status, upsell_amount, nps_score, course_completion_pct")
    .eq("status", "active")
    .not("program_end_date", "is", null)
    .order("program_end_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const withDays = (data ?? []).map((c) => {
    const endDate = new Date(c.program_end_date);
    endDate.setHours(0, 0, 0, 0);
    const diffMs = endDate.getTime() - today.getTime();
    const days_remaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { ...c, days_remaining };
  });

  // Avg satisfaction
  const rated = withDays.filter((c) => c.satisfaction_rating != null);
  const avg_satisfaction =
    rated.length > 0
      ? Math.round((rated.reduce((s, c) => s + (c.satisfaction_rating ?? 0), 0) / rated.length) * 10) / 10
      : null;

  // Upsell pipeline counts
  const upsell_pipeline = {
    candidate: withDays.filter((c) => c.upsell_status === "candidate").length,
    offered: withDays.filter((c) => c.upsell_status === "offered").length,
    accepted: withDays.filter((c) => c.upsell_status === "accepted").length,
    declined: withDays.filter((c) => c.upsell_status === "declined").length,
  };

  // Approaching end within 30 days
  const approaching = withDays.filter((c) => c.days_remaining >= 0 && c.days_remaining <= 30);

  return NextResponse.json({ approaching, avg_satisfaction, upsell_pipeline, total: withDays.length });
}
