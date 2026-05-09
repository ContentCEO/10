import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail, sendSMS } from "@/lib/notify";

export const runtime = "nodejs";

function authorize(request: Request) {
  const expected = process.env.REMINDER_CRON_SECRET;
  if (!expected) return true; // no secret configured -> allow (dev)
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer /i, "");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  return token === expected || queryToken === expected;
}

export async function POST(request: Request) {
  return run(request);
}
export async function GET(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("maintenance_reminders")
    .select("*, profiles:profiles!maintenance_reminders_customer_id_fkey(email, phone, full_name)")
    .eq("status", "pending")
    .lte("send_at", now)
    .limit(50);

  let sent = 0;
  let failed = 0;
  for (const r of due ?? []) {
    const profile = (r as any).profiles as { email: string; phone: string | null; full_name: string | null };
    const greet = profile?.full_name ? `Hi ${profile.full_name.split(" ")[0]},` : "Hi there,";
    const html = `<p>${greet}</p><p>${r.title}</p>${r.body ? `<p>${r.body}</p>` : ""}<p>— HomeCare Club</p>`;
    const sms = `${r.title}${r.body ? ` — ${r.body}` : ""}`.slice(0, 320);

    let ok = true;
    if ((r.channel === "email" || r.channel === "both") && profile?.email) {
      const res = await sendEmail({ to: profile.email, subject: r.title, html });
      ok = ok && res.ok;
    }
    if ((r.channel === "sms" || r.channel === "both") && profile?.phone) {
      const res = await sendSMS({ to: profile.phone, body: sms });
      ok = ok && res.ok;
    }

    await supabase
      .from("maintenance_reminders")
      .update({ status: ok ? "sent" : "failed", sent_at: ok ? new Date().toISOString() : null })
      .eq("id", r.id);

    ok ? sent++ : failed++;
  }

  return NextResponse.json({ checked: (due ?? []).length, sent, failed });
}
