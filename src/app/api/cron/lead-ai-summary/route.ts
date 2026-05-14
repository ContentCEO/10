import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Every 15 min, finds leads with notes but no ai_summary, generates one
// using Claude Haiku (cheap + fast), and writes ai_summary + ai_score.
//
// Cap: 20 leads per run so a single cron tick stays well under timeout
// (Haiku 4.5 latency is ~1-2s per call).

interface LeadRow {
  id: string;
  name: string;
  service_type: string | null;
  notes: string | null;
  source: string | null;
}

interface AISummary {
  summary: string;
  score: number;
}

const SYSTEM = `You score contractor leads for likelihood of closing and write a one-sentence summary.

Return a single JSON object on one line: {"summary":"...","score":NN}
- summary: 12-20 words, plain English, focuses on what the contractor should know
- score: integer 0-100. 80+ = hot lead (urgent + budget + specific). 50-79 = warm. <50 = cold/exploring.

No markdown. No prose. Just JSON.`;

function buildUser(lead: LeadRow): string {
  const parts = [
    `Name: ${lead.name}`,
    lead.service_type ? `Service: ${lead.service_type}` : null,
    lead.source ? `Source: ${lead.source}` : null,
    lead.notes ? `Notes:\n${lead.notes.slice(0, 1500)}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

function parseResult(text: string): AISummary | null {
  // Tolerant of fenced JSON or stray prose around the object.
  const match = text.match(/\{[^{}]*"summary"[^{}]*"score"[^{}]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { summary?: unknown; score?: unknown };
    if (typeof obj.summary !== "string" || typeof obj.score !== "number") return null;
    return {
      summary: obj.summary.slice(0, 300),
      score: Math.max(0, Math.min(100, Math.round(obj.score))),
    };
  } catch { return null; }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }

  const admin = createAdminClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: leads } = await admin
    .from("leads")
    .select("id,name,service_type,notes,source")
    .is("ai_summary", null)
    .not("notes", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (leads ?? []) as LeadRow[];
  let scored = 0;
  let failed = 0;

  for (const lead of rows) {
    if (!lead.notes?.trim()) { failed++; continue; }
    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: "user", content: buildUser(lead) }],
      });
      const text = res.content.find((b) => b.type === "text");
      const out = text?.type === "text" ? parseResult(text.text) : null;
      if (!out) { failed++; continue; }
      await admin.from("leads")
        .update({
          ai_summary: out.summary,
          ai_score: out.score,
          ai_scored_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      scored++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, considered: rows.length, scored, failed });
}

export async function POST(request: Request) { return GET(request); }
