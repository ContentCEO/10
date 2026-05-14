import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/messaging";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

// Missed-call → auto-SMS. Configure your Twilio number to call this URL
// when the contractor doesn't answer (call gets routed to voicemail without
// being picked up). We auto-text the caller a friendly "we missed you" SMS.
//
// Twilio TwiML pattern: use <Dial timeout="20" action="..."> — when
// dial completes with DialCallStatus=no-answer or busy, hit this URL.
// Or use Twilio Functions to post to us when a call ends unanswered.
//
// Auth: ?secret=WEBHOOK_SECRET

interface Payload {
  CallSid?: string;
  From?: string;
  To?: string;
  DialCallStatus?: string;
  user_id?: string;
}

function authorized(req: Request): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  if (req.headers.get("authorization") === `Bearer ${expected}`) return true;
  return false;
}

async function parsePayload(req: Request): Promise<Payload> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Payload;
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  params.forEach((v, k) => { out[k] = v; });
  return out as unknown as Payload;
}

const FALLBACK_TEMPLATE = (business: string) =>
  `Hey, sorry we missed your call — this is ${business}. Quickest way to a quote is to text us back here with what you need. We usually respond in under 10 minutes.`;

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = await parsePayload(request);
  if (!p.From) return NextResponse.json({ error: "From required" }, { status: 400 });

  // Only auto-text on actual missed-call statuses
  const status = (p.DialCallStatus ?? "").toLowerCase();
  if (status && !["no-answer", "busy", "failed", "missed", ""].includes(status)) {
    return NextResponse.json({ ok: true, skipped: `status=${status}` });
  }

  const admin = createAdminClient();
  let userId = p.user_id ?? null;
  if (!userId) {
    const { data: admins } = await admin
      .from("profiles").select("id").eq("is_admin", true).limit(1);
    userId = (admins?.[0] as { id?: string } | undefined)?.id ?? null;
  }
  if (!userId) return NextResponse.json({ error: "No target user" }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles").select("business_name").eq("id", userId).single();
  const business = (profile as { business_name?: string } | null)?.business_name ?? "our team";

  // Try AI-generated SMS, fallback to template
  let body = FALLBACK_TEMPLATE(business);
  try {
    const ai = await generateText({
      system: "You write short, friendly missed-call response SMS for contractors. Output the SMS body only, 1-2 sentences, no greetings like 'Sure here is'. Under 200 chars.",
      user: `Business: ${business}\nCaller phone: ${p.From}\nWrite the SMS.`,
      maxTokens: 200,
    });
    if (ai && ai.length < 320) body = ai;
  } catch { /* use fallback */ }

  const result = await sendSms(p.From, body);

  await admin.from("message_log").insert({
    user_id: userId, channel: "sms", to_address: p.From, body,
    status: result.ok ? "sent" : (result.skipped ? "skipped" : "failed"),
    provider_id: result.id ?? null, error: result.error ?? null,
    sent_at: result.ok ? new Date().toISOString() : null,
  });

  // Also log a marketplace lead so it shows up in inventory
  await admin.from("marketplace_leads").insert({
    name: "Missed caller",
    phone: p.From,
    service_type: "Phone inquiry",
    notes: `Missed call from ${p.From}. Auto-SMS sent: "${body}"`,
    budget: "unsure",
    timeline: "asap",
    ai_score: 65,
    ai_summary: "Missed call — high-intent inbound",
    price_cents: 1500,
    source_channel: "webhook",
    external_id: `missed:${p.CallSid ?? p.From}:${Date.now()}`,
  });

  return NextResponse.json({ ok: true, sent: result.ok });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "missed_call",
    usage: "POST application/x-www-form-urlencoded (Twilio default) or JSON with { From, To, DialCallStatus, CallSid }. Authorize via ?secret=WEBHOOK_SECRET.",
  });
}
