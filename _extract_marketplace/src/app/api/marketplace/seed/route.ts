import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";
import type { BudgetTier, TimelineTier } from "@/lib/marketplace";

export const runtime = "nodejs";

const VALID_BUDGETS = new Set<BudgetTier>([
  "under_5k", "5k_15k", "15k_50k", "over_50k", "unsure",
]);
const VALID_TIMELINES = new Set<TimelineTier>([
  "asap", "one_to_three_months", "three_to_six_months", "flexible",
]);

const BUDGET_PRICE_CENTS: Record<BudgetTier, number> = {
  under_5k:  1500,
  "5k_15k":  2500,
  "15k_50k": 5000,
  over_50k:  10000,
  unsure:    2500,
};

const SYSTEM = `You generate realistic sample homeowner project requests for a contractor
lead marketplace. Each request is a real-sounding inquiry — names, neighborhoods,
project details — that a real homeowner might submit. Vary across services
(kitchen remodel, bathroom remodel, roof repair, deck build, fence install, deep clean,
recurring maintenance, painting, flooring, etc.), budgets, and timelines.

Output a single JSON array of objects. Each object has these keys:
- name (string)
- phone (string, US format)
- email (string)
- city (string, real US city)
- zip (string, 5 digits matching the city)
- service_type (string, the project description, ~3-6 words)
- budget (one of: "under_5k", "5k_15k", "15k_50k", "over_50k", "unsure")
- timeline (one of: "asap", "one_to_three_months", "three_to_six_months", "flexible")
- notes (string, 1-3 sentences with realistic detail — square footage, materials, motivation)
- ai_score (integer 0-100, higher = better intent; mix the distribution)
- ai_summary (string, ≤120 chars, one sentence for contractors)

No prose, no markdown fences — just the JSON array.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const count = Math.max(1, Math.min(10, Number(body?.count ?? 5)));

  let raw: string;
  try {
    raw = await generateText({
      system: SYSTEM,
      user: `Generate ${count} sample homeowner project requests. Make them feel real and varied.`,
      maxTokens: 2400,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI generation failed" },
      { status: 500 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return NextResponse.json({ error: "Could not parse AI response" }, { status: 502 });
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return NextResponse.json({ error: "AI returned no leads" }, { status: 502 });
  }

  type Row = {
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    zip: string | null;
    service_type: string;
    budget: BudgetTier;
    timeline: TimelineTier;
    notes: string | null;
    ai_score: number;
    ai_summary: string | null;
    price_cents: number;
  };

  const rows: Row[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const service_type = typeof o.service_type === "string" ? o.service_type.trim() : "";
    if (!name || !service_type) continue;

    const budget = (VALID_BUDGETS.has(o.budget as BudgetTier) ? o.budget : "unsure") as BudgetTier;
    const timeline = (VALID_TIMELINES.has(o.timeline as TimelineTier)
      ? o.timeline : "flexible") as TimelineTier;
    const score = Math.max(0, Math.min(100, Math.round(Number(o.ai_score ?? 50))));
    const multiplier = 0.6 + (score / 100) * 1.2;
    const price_cents = Math.round(BUDGET_PRICE_CENTS[budget] * multiplier);

    rows.push({
      name,
      phone: typeof o.phone === "string" ? o.phone || null : null,
      email: typeof o.email === "string" ? o.email || null : null,
      city:  typeof o.city  === "string" ? o.city  || null : null,
      zip:   typeof o.zip   === "string" ? o.zip   || null : null,
      service_type,
      budget,
      timeline,
      notes: typeof o.notes === "string" ? o.notes || null : null,
      ai_score: score,
      ai_summary: typeof o.ai_summary === "string" ? o.ai_summary.slice(0, 200) : null,
      price_cents,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid leads parsed" }, { status: 502 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("marketplace_leads").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
