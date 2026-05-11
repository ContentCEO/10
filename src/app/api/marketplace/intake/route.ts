import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";
import {
  BUDGET_LABELS,
  TIMELINE_LABELS,
  type BudgetTier,
  type TimelineTier,
} from "@/lib/marketplace";

export const runtime = "nodejs";

const BUDGETS = new Set(Object.keys(BUDGET_LABELS));
const TIMELINES = new Set(Object.keys(TIMELINE_LABELS));

const BUDGET_PRICE_CENTS: Record<BudgetTier, number> = {
  under_5k:  1500,
  "5k_15k":  2500,
  "15k_50k": 5000,
  over_50k:  10000,
  unsure:    2500,
};

const SCORE_SYSTEM = `You score homeowner project inquiries for contractor lead marketplaces.
Return a single JSON object with exactly two keys:
- "score" — integer 0-100 representing close-likelihood (intent, urgency, budget clarity, contact completeness)
- "summary" — one short sentence (≤120 chars) summarizing the opportunity for a contractor
No prose, no markdown.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Honeypot — silently accept and drop.
  if (body?.website) return NextResponse.json({ ok: true });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const service_type = typeof body?.service_type === "string" ? body.service_type.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "Service is required" }, { status: 400 });

  const budget = (BUDGETS.has(body?.budget) ? body.budget : "unsure") as BudgetTier;
  const timeline = (TIMELINES.has(body?.timeline) ? body.timeline : "flexible") as TimelineTier;

  // Best-effort AI scoring — if it fails, fall back to sensible defaults.
  let score = 50;
  let summary: string | null = null;
  try {
    const userPrompt = `Service: ${service_type}
Budget: ${BUDGET_LABELS[budget]}
Timeline: ${TIMELINE_LABELS[timeline]}
Notes: ${typeof body?.notes === "string" ? body.notes : "(none)"}
Has phone: ${Boolean(body?.phone)}
Has email: ${Boolean(body?.email)}
ZIP: ${typeof body?.zip === "string" ? body.zip : "(missing)"}`;
    const raw = await generateText({ system: SCORE_SYSTEM, user: userPrompt, maxTokens: 200 });
    const parsed = JSON.parse(stripFences(raw));
    if (typeof parsed.score === "number") {
      score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    }
    if (typeof parsed.summary === "string") summary = parsed.summary.slice(0, 200);
  } catch {
    // ignore — score stays at 50, summary null
  }

  // Pricing: base by budget × intent multiplier. Higher score = pricier lead.
  const base = BUDGET_PRICE_CENTS[budget];
  const multiplier = 0.6 + (score / 100) * 1.2; // 0.6x at score 0, 1.8x at score 100
  const price_cents = Math.round(base * multiplier);

  const insert = {
    name,
    phone: typeof body?.phone === "string" ? body.phone || null : null,
    email: typeof body?.email === "string" ? body.email || null : null,
    zip: typeof body?.zip === "string" ? body.zip || null : null,
    city: typeof body?.city === "string" ? body.city || null : null,
    service_type,
    budget,
    timeline,
    notes: typeof body?.notes === "string" ? body.notes || null : null,
    ai_score: score,
    ai_summary: summary,
    price_cents,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("marketplace_leads").insert(insert);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
