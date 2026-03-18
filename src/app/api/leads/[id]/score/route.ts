import { createClient } from "@/lib/supabase/server";
import { calculateLeadScore } from "@/lib/scoring";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const score = calculateLeadScore(lead);
  return NextResponse.json({ lead_id: id, ...score });
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const score = calculateLeadScore(lead);

  // Update lead with calculated score
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      lead_score: score.totalScore,
      score_level: score.level,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ lead_id: id, ...score, updated: true });
}
