import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

interface Body { id?: string; body?: string }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.id || !body.body) {
    return NextResponse.json({ error: "id + body required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: vm } = await admin
    .from("voicemails").select("from_phone").eq("id", body.id).eq("user_id", user.id).single();
  if (!vm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sendSms((vm as { from_phone: string }).from_phone, body.body.slice(0, 1600));
  if (!result.ok && !result.skipped) {
    return NextResponse.json({ error: result.error ?? "SMS failed" }, { status: 502 });
  }

  await admin.from("voicemails").update({
    status: "replied",
    replied_at: new Date().toISOString(),
  }).eq("id", body.id);

  // Log to message_log for analytics
  await admin.from("message_log").insert({
    user_id: user.id,
    channel: "sms",
    to_address: (vm as { from_phone: string }).from_phone,
    body: body.body,
    status: result.ok ? "sent" : "skipped",
    provider_id: result.id ?? null,
    error: result.error ?? null,
    sent_at: result.ok ? new Date().toISOString() : null,
  });

  return NextResponse.json({ ok: true, sent: result.ok, skipped: result.skipped ?? false });
}
