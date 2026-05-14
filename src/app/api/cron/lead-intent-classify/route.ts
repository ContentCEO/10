import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Auto-classify buying intent. Every 15 min, picks up to 25 leads
// with notes but no intent_tag, asks Claude Haiku to bucket.
//
// Emergencies bump priority; price-shopping/info-request leads get
// triaged to lower attention.

const INTENTS = ["ready_to_buy", "researching", "price_shopping", "emergency", "info_request", "unknown"];

interface LeadRow {
  id: string;
  name: string;
  service_type: string | null;
  notes: string | null;
  source: string | null;
}

const SYSTEM = `Classify a contractor lead's buying intent. Pick ONE from:

ready_to_buy    — clear urgency, mentions specific dates, ready to schedule
researching     — comparing options, no firm timeline, asking lots of questions
price_shopping  — primarily focused on price, "what does it cost"
emergency       — water leak, no heat, broken something, "ASAP", "today"
info_request    — vague question, not really a buying signal
unknown         — can't tell from the info given

Output a single slug, lowercase, exactly matching one of the six above.
No quotes, no markdown, no explanation. Just one word.`;

function pick(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[^a-z_]/g, "");
  return INTENTS.includes(t) ? t : null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }

  const admin = createAdminClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: rows } = await admin
    .from("leads")
    .select("id,name,service_type,notes,source")
    .is("intent_tag", null)
    .not("notes", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  const leads = (rows ?? []) as LeadRow[];
  let tagged = 0;
  let failed = 0;
  let emergencies = 0;

  for (const lead of leads) {
    if (!lead.notes?.trim()) { failed++; continue; }
    const prompt = [
      lead.service_type ? `Service: ${lead.service_type}` : null,
      `Notes: ${lead.notes.slice(0, 1000)}`,
    ].filter(Boolean).join("\n");

    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content.find((b) => b.type === "text");
      const intent = text?.type === "text" ? pick(text.text) : null;
      if (!intent) { failed++; continue; }

      const updates: { intent_tag: string; ai_score?: number } = { intent_tag: intent };
      // Emergencies → bump AI score floor so they surface to the top.
      if (intent === "emergency") {
        updates.ai_score = 95;
        emergencies++;
      } else if (intent === "ready_to_buy") {
        updates.ai_score = Math.max(80, 80); // floor at 80, allow existing higher
      }

      await admin.from("leads").update(updates).eq("id", lead.id);
      tagged++;
    } catch { failed++; }
  }

  return NextResponse.json({ ok: true, considered: leads.length, tagged, failed, emergencies });
}

export async function POST(request: Request) { return GET(request); }
