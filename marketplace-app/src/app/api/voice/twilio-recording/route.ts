import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Twilio voicemail callback. Configure your Twilio number's voice URL to a
// TwiML <Record transcribe="true" recordingStatusCallback="..."/> verb
// that posts here on completion.
//
// Twilio sends application/x-www-form-urlencoded by default; we accept that
// AND JSON in case you're routing through Vapi/Bland/Retell instead.
//
// Auth: ?secret=WEBHOOK_SECRET query param OR Authorization: Bearer header.

interface Payload {
  CallSid?: string;
  From?: string;
  To?: string;
  RecordingUrl?: string;
  RecordingDuration?: string;
  TranscriptionText?: string;
  user_id?: string; // optional — assign to specific contractor
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
  // Twilio default: form-urlencoded
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  params.forEach((v, k) => { out[k] = v; });
  return out as unknown as Payload;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = await parsePayload(request);
  if (!p.From) {
    return NextResponse.json({ error: "From phone required" }, { status: 400 });
  }

  const admin = createAdminClient();
  let userId = p.user_id ?? null;

  // If no user_id specified, find an admin (treat as single-tenant for now)
  if (!userId) {
    const { data: admins } = await admin
      .from("profiles").select("id").eq("is_admin", true).limit(1);
    userId = (admins?.[0] as { id?: string } | undefined)?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "No target user (set ?user_id= or mark a profile is_admin)" }, { status: 400 });
  }

  const duration = p.RecordingDuration ? Number(p.RecordingDuration) : null;
  const { error } = await admin.from("voicemails").insert({
    user_id: userId,
    call_sid: p.CallSid ?? null,
    from_phone: p.From,
    to_phone: p.To ?? null,
    recording_url: p.RecordingUrl ?? null,
    duration_sec: Number.isFinite(duration) ? duration : null,
    transcription: p.TranscriptionText ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "twilio_recording",
    usage: "POST application/x-www-form-urlencoded (Twilio default) or JSON with { CallSid, From, To, RecordingUrl, RecordingDuration, TranscriptionText }. Authorize via ?secret=WEBHOOK_SECRET.",
  });
}
