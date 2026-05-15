import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { sendLobPostcard, parseStreetFromAddress } from "@/lib/lob";

export const runtime = "nodejs";
export const maxDuration = 60;

/*
 * Auto-postcard cron: for every fresh, MA-tagged scraped lead with a
 * real owner name + street address, send a Lob postcard. Idempotent
 * via raw_payload.lob_postcard_id.
 *
 * Caps total daily sends via LOB_DAILY_CAP (default 50) so a runaway
 * scraper can never blow up your Lob bill.
 */

const FRESH_DAYS = 14;
const STREET_RE = /(?:^|\n)Address:\s*(.+?)(?:\n|$)/i;

interface ScrapedRow {
  id: string;
  name: string | null;
  city: string | null;
  zip: string | null;
  notes: string | null;
  service_type: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

function extractStreet(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(STREET_RE);
  return m?.[1]?.trim() ?? null;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LOB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "LOB_API_KEY not set" }, { status: 200 });
  }
  const isTestKey = apiKey.startsWith("test_");
  const dailyCap = Number(process.env.LOB_DAILY_CAP ?? 50);

  const admin = createAdminClient();
  const since = new Date(Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Count today's sends to enforce the daily cap
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await admin
    .from("marketplace_leads")
    .select("id", { count: "exact", head: true })
    .not("raw_payload->lob_sent_at", "is", null)
    .gte("raw_payload->>lob_sent_at", todayStart.toISOString());

  const remaining = Math.max(0, dailyCap - (sentToday ?? 0));
  if (remaining === 0) {
    return NextResponse.json({ ok: true, skipped: "daily cap reached", cap: dailyCap });
  }

  const { data: candidates } = await admin
    .from("marketplace_leads")
    .select("id,name,city,zip,notes,service_type,raw_payload,created_at")
    .eq("source_channel", "scraped")
    .eq("status", "available")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(Math.min(remaining * 3, 200)); // overfetch to allow filtering

  const rows = (candidates ?? []) as ScrapedRow[];
  let sent = 0, skipped = 0, errors = 0;
  const results: { id: string; ok: boolean; reason?: string }[] = [];

  for (const r of rows) {
    if (sent >= remaining) break;

    // Skip if already mailed
    const alreadyId = r.raw_payload && typeof r.raw_payload === "object"
      ? (r.raw_payload as { lob_postcard_id?: string }).lob_postcard_id
      : undefined;
    if (alreadyId) { skipped++; continue; }

    const street = extractStreet(r.notes);
    if (!street) { skipped++; results.push({ id: r.id, ok: false, reason: "no-street" }); continue; }

    // Need name + city + zip (MA enforced by zip prefix)
    const name = (r.name ?? "").trim();
    const zip = (r.zip ?? "").trim();
    const city = (r.city ?? "").trim();
    if (!name || name.length < 2) { skipped++; results.push({ id: r.id, ok: false, reason: "no-name" }); continue; }
    if (!zip || !/^0[12]\d{3}/.test(zip)) { skipped++; results.push({ id: r.id, ok: false, reason: "not-ma-zip" }); continue; }
    if (!city) { skipped++; results.push({ id: r.id, ok: false, reason: "no-city" }); continue; }

    const parsed = parseStreetFromAddress(street);
    if (!parsed) { skipped++; results.push({ id: r.id, ok: false, reason: "bad-street" }); continue; }

    const firstName = name.split(/\s+/)[0] ?? name;
    const result = await sendLobPostcard({
      apiKey,
      testMode: isTestKey,
      description: `Auto-postcard · ${r.id}`,
      to: {
        name,
        address_line1: parsed.line1,
        address_line2: parsed.line2,
        address_city:  city,
        address_state: "MA",
        address_zip:   zip,
      },
      vars: {
        first_name:    firstName,
        address_line1: parsed.line1,
        project_type:  (r.service_type ?? "home project").toLowerCase(),
        business_name: process.env.LOB_FROM_NAME ?? "ContractorFlow",
        phone:         process.env.LOB_OUTREACH_PHONE ?? "",
        website:       process.env.LOB_OUTREACH_WEBSITE ?? "contractorflowstore.com",
      },
    });

    if (!result.ok) {
      errors++;
      results.push({ id: r.id, ok: false, reason: result.error.slice(0, 80) });
      continue;
    }

    // Mark as sent
    const merged = {
      ...(r.raw_payload as Record<string, unknown> ?? {}),
      lob_postcard_id: result.data.id,
      lob_sent_at:     new Date().toISOString(),
      lob_test_mode:   isTestKey,
    };
    await admin.from("marketplace_leads").update({ raw_payload: merged }).eq("id", r.id);

    sent++;
    results.push({ id: r.id, ok: true });
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors,
    daily_cap: dailyCap,
    used_today: (sentToday ?? 0) + sent,
    test_mode: isTestKey,
    sample_results: results.slice(0, 20),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
