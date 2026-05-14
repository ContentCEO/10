import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI cold-call script. POST /api/ai/cold-call-script  Body: { lead_id }
// Returns a 30-60 second talk-track with intro, hook, qualifying
// questions, and objection handlers. Contractor reads it off their
// phone before dialing.

interface Body { lead_id?: string }

interface Script {
  opener: string;
  hook: string;
  qualifying_questions: string[];
  if_busy: string;
  if_objection: string;
  close: string;
}

const SYSTEM = `You write contractor cold-call scripts. Given a lead's
details, output a short talk-track the contractor reads aloud.

Return EXACTLY this JSON:
{
  "opener": "string · 1 sentence, first 5 seconds",
  "hook": "string · 1 sentence specific to their service/notes",
  "qualifying_questions": ["q1", "q2", "q3"],
  "if_busy": "string · what to say if they say 'busy right now'",
  "if_objection": "string · what to say to 'just looking around'",
  "close": "string · how to ask for the next step"
}

Rules:
- Conversational, no salesy fluff
- Use the lead's actual situation (notes/service) — be specific
- Total time ~30-60 seconds spoken
- No markdown, no preamble. Just the JSON.`;

function parseScript(text: string): Script | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.opener || !Array.isArray(obj.qualifying_questions)) return null;
    return obj as Script;
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
  if (!body?.lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const { data: lead } = await supabase
    .from("leads").select("name,service_type,notes,source,price")
    .eq("id", body.lead_id).eq("user_id", user.id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles").select("business_name").eq("id", user.id).maybeSingle();
  const biz = (profile as { business_name: string | null } | null)?.business_name ?? "ContractorFlow";

  const prompt = [
    `My business: ${biz}`,
    `Lead: ${lead.name}`,
    lead.service_type ? `Service: ${lead.service_type}` : "",
    lead.source ? `Came from: ${lead.source}` : "",
    lead.price ? `Quoted value: $${lead.price}` : "",
    lead.notes ? `Notes: ${(lead.notes as string).slice(0, 1200)}` : "",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const script = parseScript(text.text);
    if (!script) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, script });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
