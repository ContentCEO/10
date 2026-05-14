import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body { service?: string; city?: string; keyword?: string; angle?: string }

const SYSTEM =
`You write SEO-optimized blog posts for local contractors targeting
long-tail keywords. Output STRICT JSON only:
{ "title": "...", "slug": "...", "body_md": "..." }
- Title: 50-70 chars, includes service + city naturally
- Slug: kebab-case, includes service + city
- body_md: 600-1000 words in Markdown. H2/H3 structure. Include sections
  for "What is X", "Why X matters", "What to expect", "How to choose a
  pro", "FAQ". Mention the city by name 4-6 times naturally. Avoid
  keyword stuffing. End with a "Get a quote" CTA paragraph.`;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.service) return NextResponse.json({ error: "service required" }, { status: 400 });

  const userMsg =
`Service: ${body.service}
City: ${body.city ?? "(general/unspecified)"}
Target keyword: ${body.keyword ?? `${body.service} ${body.city ?? ""}`}
Angle: ${body.angle ?? "general informational post for homeowners"}

Generate the JSON.`;

  try {
    const raw = await generateText({ system: SYSTEM, user: userMsg, maxTokens: 4000 });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) {
      return NextResponse.json({ error: "AI did not return JSON" }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(s, e + 1));

    const admin = createAdminClient();
    const slug = (parsed.slug ?? "").toString().slice(0, 200) || `${body.service}-${Date.now()}`;
    const { data, error } = await admin.from("blog_posts").insert({
      user_id: user.id,
      title: parsed.title?.slice(0, 200) ?? "Untitled",
      slug,
      service: body.service,
      city: body.city ?? null,
      body_md: parsed.body_md ?? "",
    }).select("id, slug").single();

    if (error && error.code === "23505") {
      // Duplicate slug — append timestamp
      const retry = await admin.from("blog_posts").insert({
        user_id: user.id,
        title: parsed.title?.slice(0, 200) ?? "Untitled",
        slug: `${slug}-${Date.now()}`,
        service: body.service,
        city: body.city ?? null,
        body_md: parsed.body_md ?? "",
      }).select("id, slug").single();
      return NextResponse.json({ ok: true, post: retry.data, ...parsed });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data, ...parsed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
