import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body { id?: string }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: vm } = await admin
    .from("voicemails").select("*").eq("id", body.id).eq("user_id", user.id).single();
  if (!vm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles").select("business_name").eq("id", user.id).single();
  const business = (profile as { business_name?: string } | null)?.business_name ?? "our team";

  const system =
`You analyze contractor voicemails. Output STRICT JSON only:
{ "summary": "1-2 sentence summary of what the caller wants",
  "suggested_reply": "An SMS-length friendly callback (~2-4 sentences)" }
The reply should:
- Greet the caller by phone or "there"
- Acknowledge their request
- Offer the next step (call back, schedule estimate, etc.)
- Sign off with the business name
- Be SMS-friendly: no markdown, no emojis unless natural`;

  const userMsg =
`Business name: ${business}
Caller phone: ${(vm as { from_phone: string }).from_phone}
Transcript: ${(vm as { transcription?: string }).transcription ?? "(no transcript — caller left a voicemail but Twilio transcription is empty)"}

Generate the JSON.`;

  try {
    const raw = await generateText({ system, user: userMsg, maxTokens: 600 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) {
      return NextResponse.json({ error: "AI did not return JSON" }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(s, e + 1)) as { summary: string; suggested_reply: string };

    await admin.from("voicemails").update({
      ai_summary: parsed.summary,
      ai_suggested_reply: parsed.suggested_reply,
    }).eq("id", body.id);

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
