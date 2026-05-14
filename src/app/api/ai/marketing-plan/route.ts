import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI weekly marketing plan. GET /api/ai/marketing-plan
// Looks at the contractor's current state (pipeline density, recent
// wins, lead sources) and asks Claude Haiku for 4 concrete marketing
// actions for the week — each with channel, copy, and effort estimate.

interface MarketingAction {
  title: string;
  channel: "sms" | "email" | "social" | "gbp" | "door" | "phone" | "ads" | "other";
  detail: string;
  est_hours: number;
  reasoning: string;
}

const SYSTEM = `You write contractor weekly marketing plans. Given a
snapshot of the business, output 4 concrete actions to run this week.

Return EXACTLY this JSON array:
[
  {
    "title": "string · 5-7 words",
    "channel": "sms" | "email" | "social" | "gbp" | "door" | "phone" | "ads" | "other",
    "detail": "string · 1-2 sentences of specifics (audience, copy, timing)",
    "est_hours": 0.5,
    "reasoning": "string · why this matters for THIS contractor right now"
  }
]

Rules:
- 4 actions. Mix of low-effort (≤30min) and bigger plays
- Tailor to the numbers given (if pipeline is dry, push lead gen; if
  inventory is high, push close-rate; if dormant customers, push
  re-engagement)
- Be specific. Not "post on social" — what to post.
- No markdown. JSON only.`;

function parse(text: string): MarketingAction[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    return arr as MarketingAction[];
  } catch { return null; }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const threeMo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const [
    { count: openPipeline },
    { count: newLeadsWk },
    { count: dormantCustomers },
    { data: profile },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).not("status", "in", "(won,lost)"),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", lastWeek),
    supabase.from("customers").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).lt("created_at", threeMo),
    supabase.from("profiles").select("business_name,services").eq("id", user.id).maybeSingle(),
  ]);

  const prof = profile as { business_name: string | null; services: string[] | null } | null;
  const services = prof?.services ?? [];

  const prompt = [
    `Business: ${prof?.business_name ?? "(unnamed)"}`,
    `Services offered: ${services.length > 0 ? services.join(", ") : "(unknown)"}`,
    `Open pipeline: ${openPipeline ?? 0} active leads`,
    `New leads last 7 days: ${newLeadsWk ?? 0}`,
    `Customers older than 90 days: ${dormantCustomers ?? 0}`,
    `Today is a ${now.toLocaleDateString("en-US", { weekday: "long" })} in ${now.toLocaleDateString("en-US", { month: "long" })}.`,
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const actions = parse(text.text);
    if (!actions || actions.length === 0) {
      return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      actions,
      snapshot: {
        open_pipeline: openPipeline ?? 0,
        new_leads_week: newLeadsWk ?? 0,
        dormant_customers: dormantCustomers ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
