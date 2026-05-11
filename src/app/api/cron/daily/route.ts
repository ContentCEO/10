import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";
import { isOutboundConfigured, sendEmail, sendSms } from "@/lib/messaging";
import { LEAD_STATUS_LABELS, type RecurringFrequency } from "@/lib/types";

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

// ---------- Recurring jobs ----------
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

    await admin.from("follow_ups").insert({
      user_id: c.user_id,
      customer_id: c.id,
      title: `Recurring service due — ${c.name}`,
      notes: c.recurring_service ?? null,
      due_at: new Date(`${c.recurring_next_at}T09:00:00`).toISOString(),
    });

    await admin.from("customers")
      .update({ recurring_next_at: addDays(c.recurring_next_at, FREQ_DAYS[c.recurring_frequency]) })
      .eq("id", c.id);
    created += 1;
  }
  return { created };
}

// ---------- Marketplace expiration ----------
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

// ---------- Auto-dispatch drip follow-ups ----------
const DRIP_SYSTEM =
  "You write short, friendly follow-up messages for contractors. Output the " +
  "message body only — no greetings like 'Sure, here is...' and no markdown. " +
  "2-4 sentences. Match the channel: SMS-style if asked for SMS, slightly " +
  "longer if email. Sign off with the business name.";

type FollowUpRow = {
  id: string;
  user_id: string;
  lead_id: string | null;
  customer_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
};

type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_type: string | null;
  notes: string | null;
  status: keyof typeof LEAD_STATUS_LABELS;
};

type ProfileRow = {
  id: string;
  business_name: string | null;
  auto_dispatch_enabled: boolean;
};

async function dispatchDueDrips() {
  const outbound = isOutboundConfigured();
  if (!outbound.sms && !outbound.email) {
    return { sent: 0, skipped: "no outbound provider configured" };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("follow_ups")
    .select("id,user_id,lead_id,customer_id,title,notes,due_at")
    .is("completed_at", null)
    .lte("due_at", nowIso)
    .not("lead_id", "is", null)
    .limit(50);

  const rows = (due ?? []) as FollowUpRow[];
  if (rows.length === 0) return { sent: 0 };

  // Fetch the users who opted in.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,business_name,auto_dispatch_enabled")
    .in("id", userIds)
    .eq("auto_dispatch_enabled", true);
  const enabled = new Set(((profiles ?? []) as ProfileRow[]).map((p) => p.id));
  const profileByUser = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const f of rows) {
    if (!enabled.has(f.user_id)) { skipped++; continue; }

    // Dedupe — don't dispatch if we already sent for this follow-up.
    const { data: prev } = await admin
      .from("message_log")
      .select("id").eq("follow_up_id", f.id).maybeSingle();
    if (prev) { skipped++; continue; }

    const { data: leadRow } = await admin
      .from("leads").select("id,name,phone,email,service_type,notes,status")
      .eq("id", f.lead_id!).single();
    if (!leadRow) { skipped++; continue; }
    const lead = leadRow as LeadRow;

    const profile = profileByUser.get(f.user_id);
    const business = profile?.business_name || "our team";
    const useSms = Boolean(outbound.sms && lead.phone);
    const useEmail = Boolean(outbound.email && lead.email && !useSms);
    if (!useSms && !useEmail) { skipped++; continue; }

    const channel = useSms ? "sms" : "email";
    let body = "";
    try {
      body = await generateText({
        system: DRIP_SYSTEM,
        user: `Channel: ${channel.toUpperCase()}
Lead name: ${lead.name}
Service: ${lead.service_type ?? "(unknown)"}
Current status: ${LEAD_STATUS_LABELS[lead.status]}
Reminder context: ${f.title}
Notes for this touch: ${f.notes ?? "(none)"}
Business name: ${business}`,
        maxTokens: 350,
      });
    } catch {
      failed++;
      await admin.from("message_log").insert({
        user_id: f.user_id, lead_id: f.lead_id, follow_up_id: f.id,
        channel, to_address: useSms ? (lead.phone ?? "") : (lead.email ?? ""),
        body: "(AI draft failed)", status: "failed", error: "AI generation failed",
      });
      continue;
    }

    const result = useSms
      ? await sendSms(lead.phone!, body)
      : await sendEmail(lead.email!, `Follow-up from ${business}`, body, business);

    await admin.from("message_log").insert({
      user_id: f.user_id, lead_id: f.lead_id, follow_up_id: f.id,
      channel,
      to_address: useSms ? lead.phone! : lead.email!,
      subject: useSms ? null : `Follow-up from ${business}`,
      body,
      status: result.ok ? "sent" : (result.skipped ? "skipped" : "failed"),
      provider_id: result.id ?? null,
      error: result.ok ? null : result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) {
      sent++;
      // Mark the calendar follow-up as completed so it stops showing up.
      await admin.from("follow_ups")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", f.id);
    } else if (!result.skipped) {
      failed++;
    } else {
      skipped++;
    }
  }

  return { sent, failed, skipped };
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  return request.headers.get("x-cron-secret") === expected;
}

async function runScraper(path: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!baseUrl) return { ok: false, error: "NEXT_PUBLIC_APP_URL not set" };
  const secret = process.env.CRON_SECRET;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data: data ?? undefined, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function run() {
  const recurring  = await generateDueRecurringJobs();
  const expiration = await expireStaleMarketplaceLeads();
  const dispatch   = await dispatchDueDrips();
  const reddit       = await runScraper("/api/scrape/reddit");
  const permits      = await runScraper("/api/scrape/permits");
  const maMunicipal  = await runScraper("/api/scrape/ma-municipal");
  const storms       = await runScraper("/api/scrape/storms?states=MA,NY,RI,NH,CT,VT,ME");
  const autoBid      = await runScraper("/api/marketplace/auto-bid");
  return {
    ok: true,
    recurring, expiration, dispatch,
    reddit, permits, maMunicipal, storms, autoBid,
    ranAt: new Date().toISOString(),
  };
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
