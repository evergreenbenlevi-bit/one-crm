import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { suggestTimeSlots, taskEnergyRequirement } from "@/lib/energy-config";
import type { TaskImpact, TaskCategory, EstimatedMinutes } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// Known contacts for invite resolution
const KNOWN_CONTACTS: Record<string, string> = {
  avitar: "avitar@one-method.com", // Avitar — ONE co-founder
};

interface CalendarCreateRequest {
  task_id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  start_time?: string;   // HH:MM — if null, auto-schedule by energy
  duration_minutes?: number;
  travel_minutes?: number;
  invite_person?: string;
  invite_confirmed?: boolean; // Must be true to actually include attendee
  // Task context for smart scheduling
  impact?: TaskImpact;
  category?: TaskCategory;
}

/**
 * POST /api/triage/calendar-create
 * Creates calendar queue entries from triage. Handles:
 * - Simple events (date + time + duration)
 * - Travel blocks (creates 2 entries: travel + work)
 * - Attendee resolution (name → email)
 * - Smart scheduling (no time → suggest based on energy windows)
 */
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CalendarCreateRequest = await request.json();
  const { task_id, title, date, start_time, duration_minutes, travel_minutes, invite_person, invite_confirmed, impact, category } = body;

  if (!task_id || !title || !date) {
    return NextResponse.json({ error: "task_id, title, and date required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const mins = duration_minutes || 30;
  const entries: Array<Record<string, unknown>> = [];

  // Resolve attendee email — only include if explicitly confirmed
  const resolvedEmail = invite_person
    ? KNOWN_CONTACTS[invite_person.toLowerCase()] || null
    : null;
  const attendeeEmail = invite_confirmed ? resolvedEmail : null;
  const needsApproval = !!(resolvedEmail && !invite_confirmed);

  // Determine start time
  let resolvedStartTime = start_time || null;
  let suggestedSlots: Array<{ start: string; end: string; label: string }> | null = null;

  if (!resolvedStartTime) {
    // Smart scheduling: use energy windows to pick optimal time
    const taskDate = new Date(date + "T12:00:00");
    const slots = suggestTimeSlots(
      { impact: impact || null, category: category || null, estimated_minutes: (mins as EstimatedMinutes) || null },
      taskDate
    );
    if (slots.length > 0) {
      resolvedStartTime = slots[0].start;
      suggestedSlots = slots;
    }
  }

  // Calculate travel block timing
  if (travel_minutes && travel_minutes > 0 && resolvedStartTime) {
    // Travel block ends when work begins
    const [hours, minutes] = resolvedStartTime.split(":").map(Number);
    const travelStartTotal = hours * 60 + minutes - travel_minutes;
    const travelStartH = Math.floor(Math.max(0, travelStartTotal) / 60);
    const travelStartM = Math.max(0, travelStartTotal) % 60;
    const travelStart = `${String(travelStartH).padStart(2, "0")}:${String(travelStartM).padStart(2, "0")}`;

    // Create travel block entry
    entries.push({
      task_id,
      title: `🚗 נסיעה — ${title}`,
      date,
      start_time: travelStart,
      duration_minutes: travel_minutes,
      status: "pending",
      is_travel_block: true,
      event_type: "travel",
    });
  }

  // Create main event entry
  entries.push({
    task_id,
    title,
    date,
    start_time: resolvedStartTime,
    duration_minutes: mins,
    status: "pending",
    attendee_email: attendeeEmail,
    travel_minutes: travel_minutes || null,
    is_travel_block: false,
    event_type: attendeeEmail ? "meeting" : "task",
  });

  // Cancel any existing pending entries for this task
  await supabase.from("calendar_queue")
    .update({ status: "cancelled" })
    .eq("task_id", task_id)
    .eq("status", "pending");

  // Insert new entries
  const { data: created, error } = await supabase
    .from("calendar_queue")
    .insert(entries)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update task status to scheduled
  await supabase.from("tasks").update({
    status: "scheduled",
    due_date: date,
    estimated_minutes: mins,
  }).eq("id", task_id);

  return NextResponse.json({
    created: true,
    entries: created,
    suggested_slots: suggestedSlots,
    attendee_resolved: resolvedEmail ? { name: invite_person, email: resolvedEmail } : null,
    needs_invite_approval: needsApproval,
  });
}
