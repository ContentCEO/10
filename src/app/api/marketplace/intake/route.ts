import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  coerceBudget,
  coerceTimeline,
  insertMarketplaceLead,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Honeypot — silently accept and drop.
  if (body?.website) return NextResponse.json({ ok: true });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const service_type = typeof body?.service_type === "string" ? body.service_type.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "Service is required" }, { status: 400 });

  const admin = createAdminClient();
  const result = await insertMarketplaceLead(admin, {
    name,
    phone: typeof body?.phone === "string" ? body.phone || null : null,
    email: typeof body?.email === "string" ? body.email || null : null,
    city:  typeof body?.city  === "string" ? body.city  || null : null,
    zip:   typeof body?.zip   === "string" ? body.zip   || null : null,
    service_type,
    budget:   coerceBudget(body?.budget),
    timeline: coerceTimeline(body?.timeline),
    notes: typeof body?.notes === "string" ? body.notes || null : null,
    source_channel: "marketplace_form",
    raw_payload: body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
