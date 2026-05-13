import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Plan 1 / Section A / Idea #13 — outbound SMS for inbox quick replies.
//
// POST /api/sms/send  { to: "+1...", body: "...", lead_id?: string }
// Sends via Twilio (or no-ops with a clean response if Twilio isn't
// configured, so demo deploys still work).

interface Body { to?: string; body?: string; lead_id?: string }

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.to || !body?.body) {
    return NextResponse.json({ error: "Body must be { to, body, lead_id? }" }, { status: 400 });
  }
  const text = body.body.trim().slice(0, 1500);
  if (!text) return NextResponse.json({ error: "Empty body" }, { status: 400 });

  const result = await sendSms(body.to, text);

  // Log to scraper_runs-style table? We don't have one — just record into
  // inbound_messages-shaped audit table for now (a future migration can
  // split it into a proper outbound_messages table).
  try {
    const admin = createAdminClient();
    await admin.from("scraper_runs").insert({
      source: "sms_outbound",
      region: body.to,
      fetched: 1,
      inserted: result.ok ? 1 : 0,
      duplicates: 0,
      error: result.ok ? null : (result.error ?? "send failed"),
    });
  } catch { /* best effort */ }

  if (!result.ok && !result.skipped) {
    return NextResponse.json({ ok: false, error: result.error ?? "send failed" }, { status: 502 });
  }
  return NextResponse.json({
    ok: result.ok,
    skipped: result.skipped ?? false,
    id: result.id ?? null,
    error: result.error ?? null,
  });
}
