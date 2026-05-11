import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecurringFrequency } from "@/lib/types";

export const runtime = "nodejs";

const FREQ_DAYS: Record<RecurringFrequency, number> = {
  weekly:    7,
  biweekly:  14,
  monthly:   30,
  quarterly: 91,
};

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function generateDueRecurringJobs() {
  const admin = createAdminClient();
  const cutoff = today();

  type DueRow = {
    id: string;
    user_id: string;
    name: string;
    recurring_frequency: RecurringFrequency;
    recurring_service: string | null;
    recurring_price: number | null;
    recurring_next_at: string;
  };

  const { data, error } = await admin
    .from("customers")
    .select("id, user_id, name, recurring_frequency, recurring_service, recurring_price, recurring_next_at")
    .eq("recurring_active", true)
    .not("recurring_frequency", "is", null)
    .not("recurring_next_at", "is", null)
    .lte("recurring_next_at", cutoff);

  if (error) return { error: error.message, created: 0 };

  const due = (data ?? []) as DueRow[];
  let created = 0;
  for (const c of due) {
    const title = c.recurring_service
      ? `${c.recurring_service} — ${c.name}`
      : `Recurring service — ${c.name}`;

    const { error: jobErr } = await admin.from("jobs").insert({
      user_id: c.user_id,
      customer_id: c.id,
      title,
      status: "scheduled",
      start_date: c.recurring_next_at,
      price: c.recurring_price,
    });
    if (jobErr) continue;

    // Also drop a follow-up reminder so the contractor sees it on the calendar.
    await admin.from("follow_ups").insert({
      user_id: c.user_id,
      customer_id: c.id,
      title: `Recurring service due — ${c.name}`,
      notes: c.recurring_service ?? null,
      due_at: new Date(`${c.recurring_next_at}T09:00:00`).toISOString(),
    });

    // Advance the schedule.
    const next = addDays(c.recurring_next_at, FREQ_DAYS[c.recurring_frequency]);
    await admin.from("customers")
      .update({ recurring_next_at: next })
      .eq("id", c.id);

    created += 1;
  }
  return { created };
}

async function expireStaleMarketplaceLeads() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("marketplace_leads")
    .update({ status: "expired" })
    .eq("status", "available")
    .lt("expires_at", new Date().toISOString())
    .select("id");
  if (error) return { error: error.message, expired: 0 };
  return { expired: (data ?? []).length };
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // local dev: allow if not configured
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  // Vercel Cron sends the secret as an arbitrary header in some configs;
  // accept either format to be safe.
  return request.headers.get("x-cron-secret") === expected;
}

async function run() {
  const recurring  = await generateDueRecurringJobs();
  const expiration = await expireStaleMarketplaceLeads();
  return { ok: true, recurring, expiration, ranAt: new Date().toISOString() };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await run());
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await run());
}
