import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI FAQ auto-responder. POST /api/ai/auto-reply-faq
// Body: { message, from? }
//
// Decides whether the inbound message is a common FAQ (hours,
// service area, pricing range, response time, where you're located,
// what you charge for X). If yes, drafts the answer and returns
// confidence. If no, returns null.
//
// The inbox UI shows the draft + a "Send" button to escalate to
// human-touch. Never auto-sends without contractor approval.

interface Body { message?: string; from?: string }

interface FaqDraft {
  is_faq: boolean;
  confidence: "low" | "medium" | "high";
  answer: string | null;
  topic: string | null;
}

const SYSTEM = `You triage inbound contractor messages. Decide if it's
a common FAQ that can be answered with a generic friendly reply.

Common FAQs:
- "What are your hours?" / "Are you open?"
- "Do you service [area]?"
- "How much does [X] cost?" (give a typical RANGE, not a quote)
- "How fast can you come out?"
- "Are you licensed/insured?"
- "Do you do [service]?"

NOT FAQs (return is_faq: false):
- Specific quote requests with details
- Emergencies
- Complaints / disputes
- Follow-up on existing work
- Anything that needs the contractor's actual knowledge

Return EXACTLY this JSON:
{
  "is_faq": true/false,
  "confidence": "low" | "medium" | "high",
  "answer": "string · the SMS-friendly reply (≤160 chars) · null if is_faq=false",
  "topic": "string · one-word topic like 'hours', 'pricing', 'service_area' · null if is_faq=false"
}

If you answer a pricing question, give a typical residential range
($X–$Y) and say "exact price depends on site visit". Don't bind the
contractor to specific numbers.

No markdown. JSON only.`;

function parse(text: string): FaqDraft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (typeof obj.is_faq !== "boolean") return null;
    return obj as FaqDraft;
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

  // Pull business profile for tone/identity (services, area).
  const { data: profile } = await supabase
    .from("profiles").select("business_name,services,service_cities")
    .eq("id", user.id).maybeSingle();
  const prof = profile as { business_name: string | null; services: string[] | null; service_cities: string[] | null } | null;

  const context = [
    `My business: ${prof?.business_name ?? "(unnamed)"}`,
    `Services: ${(prof?.services ?? []).join(", ") || "(general contracting)"}`,
    `Service area: ${(prof?.service_cities ?? []).join(", ") || "(general metro)"}`,
    "",
    `Inbound message${body?.from ? ` from ${body.from}` : ""}:`,
    message.slice(0, 1500),
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: context }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const draft = parse(text.text);
    if (!draft) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, ...draft });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
