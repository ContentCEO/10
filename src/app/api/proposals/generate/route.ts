import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body {
  brief?: string;
  service?: string;
  customer_name?: string;
  budget_hint?: string;
}

const SYSTEM =
`You build three-tier proposals (Good / Better / Best) for contractors. Output
STRICT JSON only:
{ "title": "...",
  "intro": "1-2 sentence intro the customer will read",
  "terms": "Standard payment / scheduling terms (3-5 sentences)",
  "tiers": [
    {
      "name": "Good",
      "price_cents": 850000,
      "summary": "1 sentence describing this tier",
      "line_items": [{"label":"X","qty":1,"unit_price_cents":100000}]
    },
    { "name": "Better", ... },
    { "name": "Best",   ... }
  ]}
Pricing should escalate roughly Good → 1x, Better → 1.4x, Best → 1.8x. Line
items should be concrete and contractor-accurate (materials, labor, options).
Each tier 3-6 line items. Use whole dollar amounts (price_cents in 100s).`;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.brief && !body.service) {
    return NextResponse.json({ error: "Need at least brief or service" }, { status: 400 });
  }

  const userMsg =
`Service: ${body.service ?? "(unspecified — infer from brief)"}
Customer: ${body.customer_name ?? "(unknown)"}
Budget hint: ${body.budget_hint ?? "(not provided)"}

Brief / scope:
${body.brief ?? "(no brief — infer reasonable defaults for the service)"}

Generate the 3-tier proposal JSON.`;

  try {
    const raw = await generateText({ system: SYSTEM, user: userMsg, maxTokens: 2500 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) {
      return NextResponse.json({ error: "AI did not return JSON" }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(s, e + 1));
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
