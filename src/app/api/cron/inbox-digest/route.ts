import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI daily inbox digest. Once a day, for each contractor with email,
// pull the last 24h of inbound messages and ask Claude Haiku for a
// 3-bullet summary: what to handle today, what's noise, what's the
// trend.

interface ProfRow { id: string; email: string | null; business_name: string | null; }
interface MsgRow { body: string; from_phone: string; created_at: string; matched_lead_id: string | null; }

const SYSTEM = `Summarize a contractor's last 24h of inbound SMS into 3
bullets:
  1. URGENT — what needs a same-day reply (names + 1-sentence why)
  2. WARM — what can wait til tomorrow but should not be forgotten
  3. NOISE — what to ignore / archive

Plain text, no markdown. 80 words total max. Use names if visible
in the messages. If the inbox is empty, output exactly: "Inbox was
quiet."`;

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: profs } = await admin
    .from("profiles")
    .select("id,email,business_name")
    .not("email", "is", null)
    .eq("account_type", "contractor");
  const profiles = (profs ?? []) as ProfRow[];

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  let sent = 0;
  let skipped = 0;

  for (const p of profiles) {
    if (!p.email) { skipped++; continue; }

    const { data: msgs } = await admin
      .from("inbound_messages")
      .select("body,from_phone,created_at,matched_lead_id")
      .eq("user_id", p.id)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    const messages = (msgs ?? []) as MsgRow[];
    if (messages.length === 0) { skipped++; continue; }

    const prompt = messages.map((m, i) =>
      `${i + 1}. [${new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}] from ${m.from_phone.slice(-4)}: ${m.body.slice(0, 240)}`
    ).join("\n");

    let summary = "";
    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
      const t = res.content.find((b) => b.type === "text");
      if (t && t.type === "text") summary = t.text.trim();
    } catch { /* fall through to template */ }
    if (!summary) {
      summary = `You got ${messages.length} inbound message${messages.length === 1 ? "" : "s"} yesterday. Log into the inbox to triage.`;
    }

    const body =
`Yesterday's inbox at a glance:

${summary}

Total messages: ${messages.length}

— ContractorFlow`;

    const subject = `Inbox digest · ${messages.length} message${messages.length === 1 ? "" : "s"}`;
    const result = await sendEmail(p.email, subject, body);
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, considered: profiles.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
