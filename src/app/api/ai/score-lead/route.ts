import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { LEAD_STATUS_LABELS, type Lead } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You score sales leads for contractors. Return a JSON object with exactly
two keys (no prose, no markdown fences):
- "score" — integer 0-100. Higher = more likely to close. Weight intent signals,
  budget clarity, urgency, contact completeness, and how recently the lead came in.
- "summary" — one short sentence (<=120 chars) summarizing why this score.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const { data: lead } = await supabase
    .from("leads").select("*").eq("id", leadId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const l = lead as Lead;

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(l.created_at).getTime()) / 86_400_000,
  );

  const userPrompt = `Name: ${l.name}
Service: ${l.service_type ?? "(unknown)"}
Estimated value: ${l.estimated_value ? `$${l.estimated_value}` : "(unknown)"}
Source: ${l.source ?? "(unknown)"}
Status: ${LEAD_STATUS_LABELS[l.status]}
Days since created: ${daysSinceCreated}
Has phone: ${Boolean(l.phone)}
Has email: ${Boolean(l.email)}
Notes: ${l.notes ?? "(none)"}`;

  let score = 50;
  let summary: string | null = null;
  try {
    const raw = await generateText({ system: SYSTEM, user: userPrompt, maxTokens: 250 });
    const parsed = JSON.parse(stripFences(raw));
    if (typeof parsed.score === "number") {
      score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    }
    if (typeof parsed.summary === "string") summary = parsed.summary.slice(0, 200);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI failed" },
      { status: 500 },
    );
  }

  await supabase.from("leads").update({
    ai_score: score,
    ai_summary: summary,
    ai_scored_at: new Date().toISOString(),
  }).eq("id", leadId);

  return NextResponse.json({ score, summary });
}
