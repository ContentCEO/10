import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI smart reply suggestions for inbox.
// POST /api/ai/smart-replies  Body: { thread: string[] }  (alternating msgs)
//
// Returns 3 short reply options the contractor can tap to send.
// thread[0] is the oldest msg, last entry is the latest customer msg.

interface Body { thread?: string[]; context?: string; }

const SYSTEM = `You are a contractor's quick-reply assistant. Given a
short SMS thread with a homeowner, suggest 3 different replies the
contractor could send.

Return EXACTLY this JSON array:
["reply1", "reply2", "reply3"]

Rules:
- Each reply: max 160 chars (single SMS), professional but warm
- Vary tone: one direct, one with a question, one offering next step
- No markdown, no preamble. Just the JSON array.`;

function parseReplies(text: string): string[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr) || !arr.every((x) => typeof x === "string")) return null;
    return arr.slice(0, 3).map((r) => r.slice(0, 200));
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
  if (!body?.thread || !Array.isArray(body.thread) || body.thread.length === 0) {
    return NextResponse.json({ error: "thread (array of strings) required" }, { status: 400 });
  }

  // Truncate older messages to keep prompt small.
  const trimmed = body.thread.slice(-6).map((m, i) => {
    const speaker = i % 2 === 0 ? "Customer" : "Contractor";
    return `${speaker}: ${String(m).slice(0, 400)}`;
  }).join("\n");

  const userPrompt = body.context
    ? `Context: ${body.context.slice(0, 300)}\n\nThread:\n${trimmed}`
    : `Thread:\n${trimmed}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const replies = parseReplies(text.text);
    if (!replies) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, replies });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
