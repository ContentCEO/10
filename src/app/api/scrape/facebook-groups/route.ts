import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Facebook public groups intake — manual paste only.
//
// Facebook's ToS prohibits automated scraping and Meta actively blocks
// scrapers via CAPTCHAs, IP bans, and legal action. We accept POST'd
// content from groups the contractor (or their VA) is a legitimate
// member of.
//
// Usage:
//   POST /api/scrape/facebook-groups
//   { "posts": [{ "id"?, "group": "...", "author": "...", "city": "...",
//                 "body": "...", "url"?, "posted_at"? }, ...] }
//
// External_id is `fb:<group>:<post_id_or_hash>` for dedup.

interface FbPost {
  id?: string;
  group?: string;
  author?: string;
  city?: string;
  zip?: string;
  body?: string;
  url?: string;
  posted_at?: string;
}

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

function externalIdFor(p: FbPost): string {
  const g = (p.group ?? "unknown").toLowerCase().replace(/\s+/g, "_").slice(0, 40);
  if (p.id) return `fb:${g}:${p.id}`;
  if (p.url) return `fb:${g}:${Buffer.from(p.url).toString("base64").slice(0, 40)}`;
  return `fb:${g}:hash:${Buffer.from((p.author ?? "") + (p.body?.slice(0, 100) ?? "")).toString("base64").slice(0, 40)}`;
}

async function ingest(posts: FbPost[]) {
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
      name: p.author ?? "Facebook group member",
      city: p.city ?? null,
      zip: p.zip ?? null,
      service_type: service,
      budget: "unsure",
      timeline: "flexible",
      notes:
`Source: Facebook group "${p.group ?? "(unknown)"}"
Posted: ${p.posted_at ?? "(no date)"}
URL: ${p.url ?? "(none)"}

${p.body}`,
      ai_score: 50,
      ai_summary: p.body.slice(0, 200),
      price_cents: 1000,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: p as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "facebook_groups", region: "manual paste",
    fetched: posts.length, inserted, duplicates,
  });
  return { fetched: posts.length, inserted, duplicates, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.posts)) {
    return NextResponse.json({
      error: "Body must be { posts: [{ id?, group?, author?, city?, zip?, body, url?, posted_at? }, ...] }",
    }, { status: 400 });
  }
  const result = await ingest(body.posts as FbPost[]);
  return NextResponse.json({ ok: true, source: "facebook_groups", ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "facebook_groups",
    usage:
      "POST { posts: [{ id?, group?, author?, city?, zip?, body, url?, posted_at? }, ...] }. " +
      "Manual paste only — Facebook ToS prohibits automated scraping. " +
      "Workflow: VA scrolls relevant local groups, copies posts asking for contractors, pastes JSON here.",
  });
}
