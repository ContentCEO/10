import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { scheduleLeadFollowUps } from "@/lib/follow-up-sequence";

export const runtime = "nodejs";

const SYSTEM = `You extract structured contractor lead data from free-form text.
Reply with a single JSON object — no prose, no markdown fences. Use these keys:
- name (string, required)
- phone (string or null)
- email (string or null)
- service_type (string or null) — what the customer wants done
- estimated_value (number or null) — dollar amount as a plain number
- source (string or null) — Google, referral, Facebook, Yelp, door-knock, repeat, website, etc.
- notes (string or null) — anything else worth keeping

If the text is too vague to extract a name, return {"error": "Need at least a name"}.
Do not invent details that aren't in the text.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const text = (body?.text as string | undefined)?.trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  let raw: string;
  try {
    raw = await generateText({ system: SYSTEM, user: text, maxTokens: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI failed" },
      { status: 500 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return NextResponse.json({ error: "Could not parse AI response" }, { status: 502 });
  }

  if (parsed.error) {
    return NextResponse.json({ error: String(parsed.error) }, { status: 400 });
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Need at least a name" }, { status: 400 });

  const insert = {
    user_id: user.id,
    name,
    phone: typeof parsed.phone === "string" ? parsed.phone : null,
    email: typeof parsed.email === "string" ? parsed.email : null,
    service_type: typeof parsed.service_type === "string" ? parsed.service_type : null,
    source: typeof parsed.source === "string" ? parsed.source : null,
    estimated_value: typeof parsed.estimated_value === "number" ? parsed.estimated_value : null,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    status: "new" as const,
  };

  const { data, error } = await supabase
    .from("leads").insert(insert).select("id").single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create lead" },
      { status: 500 },
    );
  }

  await scheduleLeadFollowUps(supabase, {
    userId: user.id, leadId: data.id, leadName: name,
  });

  return NextResponse.json({ id: data.id });
}
