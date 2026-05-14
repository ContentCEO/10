import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI inbox categorizer. POST /api/ai/inbox-categorize
// Body: { message: string }
// Returns { category, urgency, suggested_action }.
//
// Stateless — no DB writes. The inbox UI shows the badge inline
// and saves the category alongside the message if the user wants.

interface Body { message?: string; from?: string }

interface Category {
  category: "lead" | "customer" | "admin" | "spam" | "personal" | "vendor" | "unknown";
  urgency: "urgent" | "normal" | "low";
  suggested_action: string;
}

const SYSTEM = `Classify a single SMS or email from a contractor's inbox.
Return EXACTLY this JSON:
{
  "category": "lead" | "customer" | "admin" | "spam" | "personal" | "vendor" | "unknown",
  "urgency": "urgent" | "normal" | "low",
  "suggested_action": "string · ≤15 words, what the contractor should do next"
}

- lead: someone asking about a quote, scheduling, services
- customer: existing customer with a question / issue / scheduling
- admin: bills, taxes, banking, regulatory, software receipts
- spam: marketing, unsolicited sales pitches, scams
- personal: friend/family/non-business
- vendor: supplier reaching out
- unknown: can't tell from this message

- urgent: water leak / no heat / today problem
- normal: 1-2 day response window
- low: FYI, marketing-y, no time pressure

No markdown, no preamble. Just JSON.`;

function parse(text: string): Category | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.category || !obj.urgency) return null;
    return obj as Category;
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
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const prompt = body?.from
    ? `From: ${body.from.slice(0, 200)}\n\n${message.slice(0, 2000)}`
    : message.slice(0, 2000);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const result = parse(text.text);
    if (!result) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
