import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI proposal drafter. Given a lead_id, returns a structured 3-tier
// proposal (Good / Better / Best) with line items, scope, pricing.
// Doesn't persist — the contractor reviews + tweaks + saves via the
// existing /proposals create flow.
//
// POST /api/ai/proposal-draft  Body: { lead_id }

interface Body { lead_id?: string }

interface ProposalTier {
  name: string;
  price_cents: number;
  scope: string;
  bullets: string[];
}
interface ProposalDraft {
  title: string;
  intro: string;
  tiers: ProposalTier[];
  terms: string;
}

const SYSTEM = `You are a contractor proposal writer. Given a lead's
details, draft a clean 3-tier proposal: Good (essentials), Better
(adds value), Best (premium).

Return EXACTLY this JSON shape, nothing else:
{
  "title": "string · the proposal title",
  "intro": "string · 1-2 sentence opening to the homeowner",
  "tiers": [
    { "name": "Good",   "price_cents": 0, "scope": "string", "bullets": ["string", ...] },
    { "name": "Better", "price_cents": 0, "scope": "string", "bullets": ["string", ...] },
    { "name": "Best",   "price_cents": 0, "scope": "string", "bullets": ["string", ...] }
  ],
  "terms": "string · 2-4 sentences of plain-English terms (timeline, payment, warranty)"
}

Rules:
- Prices: anchor Better around the lead's estimated value if given;
  Good = 65% of Better; Best = 145% of Better
- Scope: 1 sentence describing what's included
- Bullets: 4-6 short feature lines per tier
- No markdown, no prose outside the JSON.`;

function buildUserPrompt(lead: {
  name: string;
  service_type: string | null;
  notes: string | null;
  estimated_value: number | null;
  source: string | null;
}): string {
  return [
    `Customer: ${lead.name}`,
    `Service: ${lead.service_type ?? "(general)"}`,
    `Estimated value: ${lead.estimated_value ? `$${lead.estimated_value}` : "(unknown)"}`,
    `Source: ${lead.source ?? "(direct)"}`,
    lead.notes ? `Notes:\n${lead.notes.slice(0, 2000)}` : "",
  ].filter(Boolean).join("\n");
}

function parseDraft(text: string): ProposalDraft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.title || !Array.isArray(obj.tiers) || obj.tiers.length === 0) return null;
    return obj as ProposalDraft;
  } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("name,service_type,notes,estimated_value,source")
    .eq("id", body.lead_id).eq("user_id", user.id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserPrompt(lead) }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const draft = parseDraft(text.text);
    if (!draft) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
