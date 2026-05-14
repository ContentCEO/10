import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { LEAD_STATUS_LABELS, type Lead } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You are a sales coach for contractors. For each lead, output a JSON object
with three keys (no prose, no markdown fences):
- "headline" — 3-7 word imperative ("Send today's estimate", "Call to confirm scope")
- "why" — one short sentence on why this is the right move now
- "draft" — a short, ready-to-send SMS or email body (3-5 sentences max) the user
  can paste into their phone. No greetings like "Sure, here is".

Base your call on the lead's current status, age, recent updates, and notes.`;

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

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(l.updated_at).getTime()) / 86_400_000,
  );

  const userPrompt = `Name: ${l.name}
Status: ${LEAD_STATUS_LABELS[l.status]}
Service: ${l.service_type ?? "(unknown)"}
Estimated value: ${l.estimated_value ? `$${l.estimated_value}` : "(unknown)"}
Source: ${l.source ?? "(unknown)"}
Days since last update: ${daysSinceUpdate}
Notes: ${l.notes ?? "(none)"}`;

  try {
    const raw = await generateText({ system: SYSTEM, user: userPrompt, maxTokens: 500 });
    const parsed = JSON.parse(stripFences(raw));
    return NextResponse.json({
      headline: typeof parsed.headline === "string" ? parsed.headline : "Reach out",
      why:      typeof parsed.why === "string" ? parsed.why : "",
      draft:    typeof parsed.draft === "string" ? parsed.draft : "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
