import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertMarketplaceLead,
  coerceBudget,
  coerceTimeline,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

// Voice AI receptionist webhook — compatible with Vapi, Bland.ai, Retell.
//
// Each platform lets you configure a "tool" or "end-of-call" webhook with a
// custom JSON payload. Point them all at this endpoint and have them post:
//
//   {
//     "secret": "<WEBHOOK_SECRET>",      // also accepted as Bearer header
//     "caller_name": "John Smith",
//     "phone": "+15551234567",
//     "email": null,
//     "city": "Acton, MA",
//     "zip": "01720",
//     "service_type": "Kitchen remodel",
//     "budget": "15k_50k",               // optional, one of our enum values
//     "timeline": "one_to_three_months", // optional
//     "transcript": "...",                // full call transcript for context
//     "call_id": "abc123"                 // platform's unique call id for dedupe
//   }
//
// Every captured call becomes a `webhook` source marketplace_lead so it
// shows up in the contractor's inventory immediately.

function isAuthorized(request: Request, body: Record<string, unknown>) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;
  if (request.headers.get("authorization") === `Bearer ${expected}`) return true;
  if (request.headers.get("x-webhook-secret") === expected) return true;
  if (typeof body?.secret === "string" && body.secret === expected) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  if (!isAuthorized(request, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = typeof body.caller_name === "string" ? body.caller_name.trim()
             : typeof body.name === "string" ? body.name.trim()
             : "";
  const service_type = typeof body.service_type === "string" ? body.service_type.trim()
                     : "Voice inquiry";

  if (!name && !body.phone) {
    return NextResponse.json({ error: "Need at least caller_name or phone" }, { status: 400 });
  }

  const admin = createAdminClient();
  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  const notes = [
    transcript ? `Transcript:\n${transcript.slice(0, 2000)}` : null,
    typeof body.notes === "string" ? body.notes : null,
  ].filter(Boolean).join("\n\n") || null;

  const result = await insertMarketplaceLead(admin, {
    name: name || "Voice caller",
    phone: typeof body.phone === "string" ? body.phone || null : null,
    email: typeof body.email === "string" ? body.email || null : null,
    city:  typeof body.city  === "string" ? body.city  || null : null,
    zip:   typeof body.zip   === "string" ? body.zip   || null : null,
    service_type,
    budget:   coerceBudget(body.budget),
    timeline: coerceTimeline(body.timeline),
    notes,
    source_channel: "webhook",
    external_id: typeof body.call_id === "string" ? `voice:${body.call_id}` : null,
    raw_payload: body,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id, deduped: result.deduped });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "voice_webhook",
    usage: "POST JSON with { caller_name, phone, email, city, zip, service_type, budget, timeline, transcript, call_id }. Authorize via Bearer WEBHOOK_SECRET, x-webhook-secret header, ?secret= query, or body.secret. Compatible with Vapi/Bland/Retell end-of-call webhooks.",
  });
}
