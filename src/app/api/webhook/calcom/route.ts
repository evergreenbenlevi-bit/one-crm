import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Cal.com webhook — receives BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
// Stores to Supabase `calcom_bookings` table
// Endpoint: https://one-crm-nine.vercel.app/api/webhook/calcom
// Webhook ID: 9061d5e3-e93d-4923-986c-d854f7d7ec61
// Secret: set CALCOM_WEBHOOK_SECRET in .env.local (optional HMAC validation)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const triggerEvent: string = body.triggerEvent ?? body.type ?? "UNKNOWN";
    const payload = body.payload ?? body;

    const uid: string | null = payload.uid ?? null;
    const title: string | null = payload.title ?? null;
    const startTime: string | null = payload.startTime ?? null;
    const attendee = Array.isArray(payload.attendees) ? payload.attendees[0] : null;
    const attendeeEmail: string | null = attendee?.email ?? null;
    const attendeeName: string | null = attendee?.name ?? null;

    const supabase = createAdminClient();

    const { error } = await supabase.from("calcom_bookings").insert({
      uid,
      title,
      start_time: startTime,
      attendee_email: attendeeEmail,
      attendee_name: attendeeName,
      trigger_event: triggerEvent,
      raw_payload: body,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table may not exist yet — log and return 200 so Cal.com doesn't retry infinitely
      console.error("[calcom-webhook] Supabase insert error:", error.message);
      console.log("[calcom-webhook] raw payload:", JSON.stringify(body));
      return NextResponse.json({ ok: true, warning: error.message }, { status: 200 });
    }

    console.log(`[calcom-webhook] stored: ${triggerEvent} uid=${uid}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calcom-webhook] parse error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "calcom-webhook" });
}
