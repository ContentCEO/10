import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Nextdoor intake — manual paste only.
//
// Nextdoor's ToS prohibits automated scraping and the platform actively
// blocks scrapers. To stay safe we accept a POST body with one or more
// posts pasted from the Nextdoor web UI (by the contractor or a VA).
//
// Usage:
//   POST /api/scrape/nextdoor
//   { "posts": [{ "id": "...", "author": "...", "neighborhood": "...",
//                 "city": "...", "body": "...", "url": "..." }, ...] }
//
// Each post becomes a marketplace lead tagged 'scraped' with external_id
// `nextdoor:<post_id_or_url_hash>` for dedup.

interface NextdoorPost {
  id?: string;
  author?: string;
  neighborhood?: string;
  city?: string;
  zip?: string;
  body?: string;
  url?: string;
  posted_at?: string;
}

// Look at the post body for service-type signal so the lead lands with
// the right category in the marketplace.
function inferService(body: string): string {
  const b = body.toLowerCase();
  const checks: { match: RegExp; label: string }[] = [
    { match: /\bkitchen\b/,                       label: "Kitchen remodel" },
    { match: /\bbath(?:room)?\b|\bshower\b|\btub\b/, label: "Bathroom remodel" },
    { match: /\broof|shingle/,                    label: "Roofing" },
    { match: /\bsiding|stucco/,                   label: "Siding" },
    { match: /\bdeck|porch|pergola/,              label: "Deck / porch" },
    { match: /\bfence|gate/,                      label: "Fence install" },
    { match: /\belectric|panel|outlet|rewire|ev charger/, label: "Electrical" },
    { match: /\bplumb|leak|water heater|drain|toilet|sewer/, label: "Plumbing" },
    { match: /\bhvac|furnace|boiler|heat pump|mini split|ac\b/, label: "HVAC" },
    { match: /\bpaint/,                           label: "Painting" },
    { match: /\bfloor|hardwood|carpet|tile/,      label: "Flooring" },
    { match: /\bwindow/,                          label: "Window replacement" },
    { match: /\blandscap|lawn|mulch|tree/,        label: "Landscaping" },
    { match: /\bconcrete|driveway|asphalt/,       label: "Concrete / driveway" },
    { match: /\bbasement|attic|addition/,         label: "Renovation" },
    { match: /\bclean|maid/,                      label: "Cleaning" },
    { match: /\bhandyman|fix it/,                 label: "Handyman" },
  ];
  for (const { match, label } of checks) {
    if (match.test(b)) return label;
  }
  return "Homeowner inquiry";
}

function externalIdFor(p: NextdoorPost): string {
  if (p.id) return `nextdoor:${p.id}`;
  if (p.url) return `nextdoor:${Buffer.from(p.url).toString("base64").slice(0, 40)}`;
  return `nextdoor:hash:${Buffer.from((p.author ?? "") + (p.body?.slice(0, 100) ?? "")).toString("base64").slice(0, 40)}`;
}

async function ingest(posts: NextdoorPost[]) {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, skipped = 0;
  for (const p of posts) {
    if (!p.body || p.body.trim().length < 10) { skipped++; continue; }
    const externalId = externalIdFor(p);
    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const service = inferService(p.body);
    const { error } = await admin.from("marketplace_leads").insert({
      name: p.author ?? "Nextdoor neighbor",
      city: p.city ?? null,
      zip: p.zip ?? null,
      service_type: service,
      budget: "unsure",
      timeline: "flexible",
      notes:
`Source: Nextdoor (${p.neighborhood ?? "neighborhood unknown"})
Posted: ${p.posted_at ?? "(no date)"}
URL: ${p.url ?? "(none)"}

${p.body}`,
      ai_score: 55,
      ai_summary: p.body.slice(0, 200),
      price_cents: 1200,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: p as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "nextdoor", region: "manual paste",
    fetched: posts.length, inserted, duplicates,
  });
  return { fetched: posts.length, inserted, duplicates, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.posts)) {
    return NextResponse.json({
      error: "Body must be { posts: [{ id?, author?, neighborhood?, city?, zip?, body, url?, posted_at? }, ...] }",
    }, { status: 400 });
  }
  const result = await ingest(body.posts as NextdoorPost[]);
  return NextResponse.json({ ok: true, source: "nextdoor", ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "nextdoor",
    usage:
      "POST { posts: [{ id?, author?, neighborhood?, city?, zip?, body, url?, posted_at? }, ...] }. " +
      "Manual paste only — Nextdoor's ToS prohibits automated scraping. " +
      "Use this with a VA workflow: VA opens Nextdoor, copies relevant posts, pastes JSON here.",
  });
}
