import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI best-time-to-call. POST /api/ai/best-call-time
// Body: { lead_id }
//
// Looks at the lead's history (when their messages came in, their
// notes' urgency cues) and the contractor's typical response patterns,
// suggests a specific time slot. Picks weekday business hours and
// avoids the contractor's known peak inbound period.

interface Body { lead_id?: string }

interface Suggestion {
  recommended_at: string;     // ISO timestamp
  reasoning: string;
  fallback_slots: string[];   // ISO timestamps
  confidence: "low" | "medium" | "high";
}

const SYSTEM = `You suggest the best time for a contractor to call back
a lead. Use the lead's context + current time + sensible defaults
(business hours, weekdays unless emergency).

Return EXACTLY this JSON:
{
  "recommended_at": "ISO timestamp",
  "reasoning": "1 sentence why this time",
  "fallback_slots": ["ISO timestamp", "ISO timestamp"],
  "confidence": "low" | "medium" | "high"
}

Rules:
- Times must be in the FUTURE
- Prefer Tue-Thu mid-morning (10:00) or early-afternoon (14:00) — historically highest answer rates
- If notes show urgency (water, leak, broken, today, ASAP) → next business hour
- Otherwise → next business day morning
- Avoid Mondays before 10am, Fridays after 3pm, weekends
- All times in ISO with Z suffix (UTC)
- No markdown, JSON only.`;

function parse(text: string): Suggestion | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.recommended_at || !obj.reasoning) return null;
    return obj as Suggestion;
  } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const { data: lead } = await supabase
    .from("leads")
    .select("name,service_type,notes,intent_tag,created_at,phone")
    .eq("id", body.lead_id).eq("user_id", user.id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const now = new Date();
  const ctx = [
    `Now: ${now.toISOString()} (${now.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" })})`,
    `Lead: ${(lead as { name: string }).name}`,
    (lead as { service_type: string | null }).service_type ? `Service: ${(lead as { service_type: string }).service_type}` : "",
    (lead as { intent_tag: string | null }).intent_tag ? `Intent: ${(lead as { intent_tag: string }).intent_tag}` : "",
    `Lead came in: ${(lead as { created_at: string }).created_at}`,
    (lead as { notes: string | null }).notes ? `Notes: ${((lead as { notes: string }).notes).slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: ctx }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const suggestion = parse(text.text);
    if (!suggestion) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, ...suggestion });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
