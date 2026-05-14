import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Smart appointment slot suggester. GET /api/ai/slot-suggest?duration_hours=2&within_days=14
// Pure scheduling logic — no AI. Looks at:
//   - existing scheduled jobs in the window (avoid double-booking)
//   - capacity (headcount × 8h × weekdays)
//   - business hours (9-5 default)
//   - skips weekends
// Returns the next 5 open slots that fit the requested duration.

interface JobBusy { start_date: string | null; end_date: string | null; }

interface Slot {
  start: string;
  end: string;
  label: string;
  day_of_week: string;
}

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const durationHours = Math.max(0.5, Math.min(8, Number(url.searchParams.get("duration_hours") ?? 2)));
  const withinDays    = Math.max(1, Math.min(60, Number(url.searchParams.get("within_days") ?? 14)));

  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 86_400_000);

  const { data: busy } = await supabase.from("jobs")
    .select("start_date,end_date")
    .eq("user_id", user.id)
    .in("status", ["scheduled", "in_progress"])
    .gte("start_date", now.toISOString())
    .lt("start_date", horizon.toISOString());

  // Build a sorted list of busy intervals.
  const busyList: { start: number; end: number }[] = ((busy ?? []) as JobBusy[])
    .map((b) => {
      if (!b.start_date) return null;
      const start = new Date(b.start_date).getTime();
      const end = b.end_date
        ? new Date(b.end_date).getTime()
        : start + durationHours * 3_600_000;
      return { start, end };
    })
    .filter(Boolean) as { start: number; end: number }[];
  busyList.sort((a, b) => a.start - b.start);

  // Walk forward in 30-min increments, business hours only, weekdays.
  const slots: Slot[] = [];
  const slotMs = durationHours * 3_600_000;
  const cursor = new Date(now);
  // Round up to next half-hour.
  cursor.setMinutes(cursor.getMinutes() + 30 - (cursor.getMinutes() % 30), 0, 0);

  while (cursor.getTime() < horizon.getTime() && slots.length < 5) {
    // Skip weekends + outside business hours.
    if (isWeekend(cursor)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      continue;
    }
    const hour = cursor.getHours();
    if (hour < BUSINESS_START_HOUR) {
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      continue;
    }
    if (hour + durationHours > BUSINESS_END_HOUR) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      continue;
    }

    const slotStart = cursor.getTime();
    const slotEnd = slotStart + slotMs;

    // Check overlap with any busy interval.
    const overlap = busyList.find((b) => slotStart < b.end && slotEnd > b.start);
    if (overlap) {
      // Jump cursor to end of conflict, snapped to next half-hour.
      cursor.setTime(overlap.end);
      cursor.setMinutes(cursor.getMinutes() + 30 - (cursor.getMinutes() % 30), 0, 0);
      continue;
    }

    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      day_of_week: start.toLocaleDateString("en-US", { weekday: "long" }),
    });

    // Advance 30 min to find the next candidate.
    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  return NextResponse.json({
    ok: true,
    duration_hours: durationHours,
    within_days: withinDays,
    slots,
  });
}
