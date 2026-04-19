// Google Calendar sync — one-directional: tasks → calendar
// Called when a task is saved with due_date + time_slot set
// Spec: TASK-MANAGER-REDESIGN-SPEC-V2.md section 10

const SLOT_START_HOUR: Record<string, number> = {
  morning: 9,
  afternoon: 14,
  evening: 20,
};

const SLOT_END_HOUR: Record<string, number> = {
  morning: 12,
  afternoon: 17,
  evening: 22,
};

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_EMAIL ?? "primary";

type CalendarEvent = {
  id: string;
  start: { dateTime: string };
  end: { dateTime: string };
};

// Exchange refresh token for access token
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// Fetch events in a time window to detect collisions
async function getEventsInWindow(
  token: string,
  date: string,
  startHour: number,
  endHour: number
): Promise<CalendarEvent[]> {
  const tz = "Asia/Jerusalem";
  const timeMin = `${date}T${String(startHour).padStart(2, "0")}:00:00+03:00`;
  const timeMax = `${date}T${String(endHour).padStart(2, "0")}:00:00+03:00`;

  try {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
    );
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeZone", tz);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as { items?: CalendarEvent[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

// Find earliest free slot within window for a given duration
function findFreeSlot(
  events: CalendarEvent[],
  date: string,
  startHour: number,
  endHour: number,
  durationMins: number
): { start: Date; conflict: boolean } {
  const base = new Date(`${date}T00:00:00+03:00`);
  const windowStart = new Date(base);
  windowStart.setHours(startHour, 0, 0, 0);
  const windowEnd = new Date(base);
  windowEnd.setHours(endHour, 0, 0, 0);

  let cursor = new Date(windowStart);

  for (const event of events) {
    const evStart = new Date(event.start.dateTime);
    const evEnd = new Date(event.end.dateTime);

    // If cursor + duration fits before this event starts
    const cursorEnd = new Date(cursor.getTime() + durationMins * 60_000);
    if (cursorEnd <= evStart) {
      return { start: cursor, conflict: false };
    }
    // Push cursor past this event
    if (evEnd > cursor) cursor = evEnd;
  }

  // Check if cursor fits before window end
  const cursorEnd = new Date(cursor.getTime() + durationMins * 60_000);
  if (cursor >= windowStart && cursorEnd <= windowEnd) {
    return { start: cursor, conflict: false };
  }

  // No free slot — fall back to slot start with conflict marker
  return { start: windowStart, conflict: true };
}

export interface CalendarSyncOptions {
  taskId: string;
  title: string;
  due_date: string;       // YYYY-MM-DD
  time_slot: string;      // morning | afternoon | evening | any
  estimated_minutes?: number | null;
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  conflict?: boolean;
  error?: string;
}

export async function syncTaskToCalendar(
  opts: CalendarSyncOptions
): Promise<CalendarSyncResult> {
  const { taskId, title, due_date, time_slot, estimated_minutes } = opts;

  // Only sync tasks with a specific slot
  if (!time_slot || time_slot === "any") {
    return { success: false, error: "no time_slot — skipped" };
  }

  const startHour = SLOT_START_HOUR[time_slot];
  const endHour = SLOT_END_HOUR[time_slot];

  if (startHour === undefined) {
    return { success: false, error: `unknown time_slot: ${time_slot}` };
  }

  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: "failed to get access token" };
  }

  const durationMins = estimated_minutes ?? 60;

  // Check existing events for collision
  const existingEvents = await getEventsInWindow(token, due_date, startHour, endHour);
  const { start: slotStart, conflict } = findFreeSlot(
    existingEvents,
    due_date,
    startHour,
    endHour,
    durationMins
  );

  const slotEnd = new Date(slotStart.getTime() + durationMins * 60_000);

  const eventTitle = conflict ? `${title} (conflict)` : title;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: eventTitle,
          description: `ONE-CRM task ID: ${taskId}`,
          start: { dateTime: slotStart.toISOString(), timeZone: "Asia/Jerusalem" },
          end: { dateTime: slotEnd.toISOString(), timeZone: "Asia/Jerusalem" },
          colorId: conflict ? "11" : "5", // 11=red, 5=banana
        }),
      }
    );

    const created = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok) {
      return { success: false, error: created.error?.message ?? "API error" };
    }

    return { success: true, eventId: created.id, conflict };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
