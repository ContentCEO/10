import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  coerceBudget,
  coerceTimeline,
  insertMarketplaceLead,
  type LeadSourceChannel,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  if (request.headers.get("x-webhook-secret") === expected) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

const VALID_SOURCES: LeadSourceChannel[] = [
  "google_ads", "meta_facebook", "meta_instagram",
  "website_form", "marketplace_form", "webhook", "manual", "scraped",
];

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  const service_type = typeof b.service_type === "string" ? b.service_type.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "service_type required" }, { status: 400 });

  const sourceRaw = typeof b.source_channel === "string" ? b.source_channel : "webhook";
  const source_channel: LeadSourceChannel = (VALID_SOURCES as string[]).includes(sourceRaw)
    ? (sourceRaw as LeadSourceChannel)
    : "webhook";

  const admin = createAdminClient();
  const result = await insertMarketplaceLead(admin, {
    name,
    phone: typeof b.phone === "string" ? b.phone || null : null,
    email: typeof b.email === "string" ? b.email || null : null,
    city:  typeof b.city  === "string" ? b.city  || null : null,
    zip:   typeof b.zip   === "string" ? b.zip   || null : null,
    service_type,
    budget:   coerceBudget(b.budget),
    timeline: coerceTimeline(b.timeline),
    notes: typeof b.notes === "string" ? b.notes || null : null,
    source_channel,
    external_id: typeof b.external_id === "string" ? b.external_id : null,
    raw_payload: b,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    id: result.id,
    deduped: result.deduped,
  });
}
