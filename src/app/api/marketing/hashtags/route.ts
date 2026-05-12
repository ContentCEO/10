import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body { service?: string; city?: string }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const service = (body.service ?? "").slice(0, 80);
  const city = (body.city ?? "").slice(0, 80);
  if (!service) return NextResponse.json({ error: "service required" }, { status: 400 });

  const system =
`You recommend hashtags for contractors and home-service businesses.
Output STRICT JSON only:
{ "results": [
    { "platform": "Instagram", "tags": ["#tag1","#tag2",...] },
    { "platform": "TikTok",    "tags": [...] },
    { "platform": "Facebook",  "tags": [...] },
    { "platform": "LinkedIn",  "tags": [...] }
  ] }
Each platform: 15-25 hashtags. Mix high-volume (#construction), niche
(#roofingcontractor), local (#bostonpainters), and intent (#hireapro,
#needaroofer). No generic spam (#love, #cute, #instagood).
LinkedIn uses fewer / professional tags (10-15 is enough).`;

  const userMsg = `Service: ${service}${city ? `\nCity: ${city}` : ""}`;

  try {
    const raw = await generateText({ system, user: userMsg, maxTokens: 1200 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: "AI did not return JSON" }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { results?: { platform: string; tags: string[] }[] };
    return NextResponse.json({ results: parsed.results ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
