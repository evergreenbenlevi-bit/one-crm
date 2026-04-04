import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { suggestTimeSlots } from "@/lib/energy-config";
import type { TaskImpact, TaskCategory, EstimatedMinutes } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

/**
 * POST /api/triage/suggest-slots
 * Returns up to 3 energy-optimal time slots for a given date + task profile.
 * Body: { date: YYYY-MM-DD, duration_minutes?, impact?, category? }
 */
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, duration_minutes, impact, category } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const taskDate = new Date(date + "T12:00:00");
  const slots = suggestTimeSlots(
    {
      impact: (impact as TaskImpact) || null,
      category: (category as TaskCategory) || null,
      estimated_minutes: (duration_minutes as EstimatedMinutes) || null,
    },
    taskDate
  );

  return NextResponse.json({ date, slots });
}
