import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { isQualifiedLead } from "@/lib/lead-quality";

export const runtime = "nodejs";

/*
 * Mirror new marketplace_leads rows into the owner's `leads` table.
 *
 * Scrapers all insert into marketplace_leads (so other contractors can buy
 * them later). But the owner also wants every scraped lead to flow into
 * their own /leads pipeline immediately. This cron does that mirroring in
 * one place so the 22 individual scrapers stay untouched.
 *
 * Each marketplace_leads row carries an external_id; we use that as the
 * idempotency key on the leads side via a "scrape:<external_id>" source
 * suffix.
 */

const HARDCODED_OWNER_EMAIL = "davichavespb2025@gmail.com";

function budgetMidpoint(tier: string | null): number | null {
  switch (tier) {
    case "under_5k": return 3500;
    case "5k_15k":   return 10000;
    case "15k_50k":  return 30000;
    case "over_50k": return 75000;
    default:         return null;
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Loose mode: auto-flush the curation queue every run so scraped leads
  // appear in /marketplace immediately, no manual approval needed.
  const { data: flushed } = await admin
    .from("marketplace_leads")
    .update({ requires_curation: false, curated_at: new Date().toISOString() })
    .eq("requires_curation", true)
    .eq("source_channel", "scraped")
    .select("id");
  const autoApproved = flushed?.length ?? 0;
  const ownerEmail = (process.env.OWNER_EMAIL ?? HARDCODED_OWNER_EMAIL).toLowerCase();
  // Look up the owner via auth (profiles table doesn't store email).
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const ownerUser = usersList?.users.find((u) => u.email?.toLowerCase() === ownerEmail);

  if (!ownerUser?.id) {
    return NextResponse.json({ ok: false, error: "owner user not found", auto_approved: autoApproved }, { status: 200 });
  }
  const ownerId = ownerUser.id;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Mirror EVERY source channel into the owner's /leads pipeline —
  // scraped permits, Meta Lead Ads, /quote calculator form-fills,
  // marketplace forms, etc. The quality gate below filters out the
  // unqualified ones.
  const { data: fresh, error: fetchErr } = await admin
    .from("marketplace_leads")
    .select("id,name,phone,email,city,zip,service_type,budget,ai_score,ai_summary,notes,source_channel,external_id,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  const candidates = fresh ?? [];
  let mirrored = 0;
  let skipped = 0;
  let rejectedQuality = 0;

  for (const m of candidates) {
    const quality = isQualifiedLead({
      name: m.name, phone: m.phone, city: m.city, zip: m.zip, notes: m.notes,
    });
    if (!quality.ok) { rejectedQuality++; continue; }

    const sourceTag = m.external_id ? `scrape:${m.external_id}` : `scrape:${m.id}`;

    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("user_id", ownerId)
      .eq("source", sourceTag)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    const { error: insertErr } = await admin.from("leads").insert({
      user_id: ownerId,
      name: m.name,
      phone: m.phone,
      email: m.email,
      source: sourceTag,
      service_type: m.service_type,
      estimated_value: budgetMidpoint(m.budget),
      status: "new",
      notes: [
        m.city || m.zip ? `Location: ${[m.city, m.zip].filter(Boolean).join(", ")}` : null,
        m.notes,
      ].filter(Boolean).join("\n\n"),
      ai_score: m.ai_score,
      ai_summary: m.ai_summary,
    });
    if (!insertErr) mirrored++;
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    mirrored,
    skipped,
    rejected_quality: rejectedQuality,
    auto_approved: autoApproved,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
