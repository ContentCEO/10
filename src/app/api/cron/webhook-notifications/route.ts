import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Slack / Discord / generic webhook firehose for high-signal events.
// Once every 5 min, finds new "hot" things from the last 5 min and
// POSTs them to each contractor's alert_webhook_url.
//
// Auto-detects Slack vs Discord vs generic by URL pattern and adapts
// the payload shape.

interface Profile {
  id: string;
  business_name: string | null;
  alert_webhook_url: string | null;
}
interface LeadAlert {
  id: string;
  user_id: string;
  name: string;
  service_type: string | null;
  ai_score: number | null;
  intent_tag: string | null;
  created_at: string;
}
interface JobWonAlert {
  id: string;
  user_id: string;
  title: string;
  price: number | null;
  updated_at: string;
}

function buildPayload(url: string, title: string, body: string) {
  if (url.includes("slack.com")) {
    return { text: `*${title}*\n${body}` };
  }
  if (url.includes("discord")) {
    return {
      embeds: [{
        title,
        description: body,
        color: 0x2563EB,
        timestamp: new Date().toISOString(),
      }],
    };
  }
  // Generic JSON
  return { title, body, ts: new Date().toISOString() };
}

async function postWebhook(url: string, payload: object): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Pull contractors with a webhook configured.
  const { data: profs } = await admin
    .from("profiles")
    .select("id,business_name,alert_webhook_url")
    .not("alert_webhook_url", "is", null);
  const profiles = (profs ?? []) as Profile[];
  if (profiles.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, posted: 0 });
  }
  const wantsByUser = new Map(profiles.map((p) => [p.id, p.alert_webhook_url!]));

  // Hot new leads (score ≥ 80 OR intent=emergency) in last 5 min
  const { data: leads } = await admin
    .from("leads")
    .select("id,user_id,name,service_type,ai_score,intent_tag,created_at")
    .or("ai_score.gte.80,intent_tag.eq.emergency")
    .gte("created_at", fiveMinAgo)
    .in("user_id", Array.from(wantsByUser.keys()));

  // Newly won jobs in last 5 min (jobs that flipped to completed)
  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,title,price,updated_at")
    .eq("status", "completed")
    .gte("updated_at", fiveMinAgo)
    .in("user_id", Array.from(wantsByUser.keys()));

  let posted = 0;

  for (const l of ((leads ?? []) as LeadAlert[])) {
    const url = wantsByUser.get(l.user_id);
    if (!url) continue;
    const title = l.intent_tag === "emergency" ? "🚨 Emergency lead" : "🔥 Hot lead";
    const body = `${l.name}${l.service_type ? ` · ${l.service_type}` : ""} · score ${l.ai_score ?? "?"}`;
    if (await postWebhook(url, buildPayload(url, title, body))) posted++;
  }

  for (const j of ((jobs ?? []) as JobWonAlert[])) {
    const url = wantsByUser.get(j.user_id);
    if (!url) continue;
    const title = "✅ Job completed";
    const body = `${j.title}${j.price ? ` · $${j.price.toLocaleString()}` : ""}`;
    if (await postWebhook(url, buildPayload(url, title, body))) posted++;
  }

  return NextResponse.json({
    ok: true,
    contractors: profiles.length,
    lead_events: (leads ?? []).length,
    job_events: (jobs ?? []).length,
    posted,
  });
}

export async function POST(request: Request) { return GET(request); }
