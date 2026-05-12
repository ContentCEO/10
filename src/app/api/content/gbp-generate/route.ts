import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body {
  kind?: "update" | "offer" | "event" | "product";
  service?: string;
  city?: string;
  topic?: string;
  cta_url?: string;
}

const SYSTEM =
`You write Google Business Profile posts for contractors. Output STRICT JSON:
{ "title": "...", "body": "...", "cta_label": "...", "cta_url": "..." }
- Title: 60 chars max (optional, can be empty string)
- Body: 100-250 chars. Friendly, local, action-oriented. Mention the city
  if provided. No hashtags (GBP doesn't render them well).
- cta_label: short action verb phrase ("Book online", "Get a quote",
  "Call us today", "Learn more"). Match the kind.
- cta_url: pass through whatever was provided, else empty string.`;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.topic && !body.service) {
    return NextResponse.json({ error: "topic or service required" }, { status: 400 });
  }

  const userMsg =
`Kind: ${body.kind ?? "update"}
Service: ${body.service ?? "(general)"}
City: ${body.city ?? "(unspecified)"}
Topic / message: ${body.topic ?? `general update about ${body.service}`}
CTA URL: ${body.cta_url ?? ""}

Generate the JSON.`;

  try {
    const raw = await generateText({ system: SYSTEM, user: userMsg, maxTokens: 600 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) {
      return NextResponse.json({ error: "AI did not return JSON" }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(s, e + 1));

    const admin = createAdminClient();
    const { data, error } = await admin.from("gbp_posts").insert({
      user_id: user.id,
      kind: body.kind ?? "update",
      title: parsed.title?.slice(0, 100) ?? null,
      body: parsed.body?.slice(0, 1500) ?? "",
      cta_label: parsed.cta_label?.slice(0, 40) ?? null,
      cta_url: parsed.cta_url || body.cta_url || null,
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data, ...parsed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
