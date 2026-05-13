import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Daily cron — auto-generates jobs from customers with active recurring
// schedules. Fires when `recurring_next_at <= now()` and bumps the
// schedule forward by the customer's frequency.
//
// HVAC quarterly tune-ups, biweekly lawn care, monthly pool service —
// all run on autopilot. The contractor doesn't have to remember.

const FREQ_DAYS: Record<string, number> = {
  weekly:    7,
  biweekly:  14,
  monthly:   30,
  quarterly: 90,
};

interface RecurringCustomer {
  id: string;
  user_id: string;
  name: string;
  recurring_frequency: keyof typeof FREQ_DAYS | null;
  recurring_service: string | null;
  recurring_price: number | null;
  recurring_next_at: string | null;
  lat: number | null;
  lng: number | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("customers")
    .select("id,user_id,name,recurring_frequency,recurring_service,recurring_price,recurring_next_at,lat,lng")
    .eq("recurring_active", true)
    .not("recurring_frequency", "is", null)
    .not("recurring_next_at", "is", null)
    .lte("recurring_next_at", nowIso)
    .limit(500);

  const rows = (due ?? []) as RecurringCustomer[];
  let created = 0;
  let skipped = 0;

  for (const c of rows) {
    const freq = c.recurring_frequency;
    if (!freq || !FREQ_DAYS[freq]) { skipped++; continue; }

    const title = c.recurring_service
      ? `${c.recurring_service} · ${c.name}`
      : `Recurring service · ${c.name}`;
    const startDate = new Date(c.recurring_next_at!);

    const { error } = await admin.from("jobs").insert({
      user_id: c.user_id,
      customer_id: c.id,
      title,
      description: `Auto-generated from ${freq} recurring schedule.`,
      start_date: startDate.toISOString(),
      status: "scheduled",
      price: c.recurring_price ?? null,
      lat: c.lat,
      lng: c.lng,
    });
    if (error) { skipped++; continue; }

    // Advance the schedule.
    const nextAt = new Date(startDate);
    nextAt.setDate(nextAt.getDate() + FREQ_DAYS[freq]);
    await admin.from("customers")
      .update({ recurring_next_at: nextAt.toISOString() })
      .eq("id", c.id);

    created++;
  }

  return NextResponse.json({
    ok: true,
    due: rows.length,
    created,
    skipped,
  });
}

export async function POST(request: Request) { return GET(request); }
