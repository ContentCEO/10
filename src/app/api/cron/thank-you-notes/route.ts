import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Thank-you note drafter. 2 days after a job completes, draft a
// personalized thank-you (AI if available, template fallback) and
// queue as a follow-up for the contractor to send manually.
//
// Different vibe from the NPS auto-send (J-1, day 7) and from the
// GBP auto-draft (H-4, completion+1h). This one is for the
// contractor to handwrite or text — the human-touch moment that
// converts customers into evangelists.

const TAG = "[thank-you-drafted]";

interface JobRow {
  id: string;
  user_id: string;
  title: string;
  customer_id: string | null;
  description: string | null;
  updated_at: string;
}
interface CustRow { id: string; name: string | null; }
interface BizRow { business_name: string | null; }

const SYSTEM = `Write a warm 2-sentence thank-you note from a contractor
to a homeowner after completing a job. Conversational, specific to the
service, no markdown, no "Dear", no signature. Just the body text.

Max 200 chars. First-name only.`;

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const haveAI = !!process.env.ANTHROPIC_API_KEY;
  const client = haveAI ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }) : null;

  // Jobs completed 2-3 days ago.
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const twoDaysAgo   = new Date(Date.now() - 2 * 86_400_000).toISOString();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,title,customer_id,description,updated_at")
    .eq("status", "completed")
    .gt("updated_at", threeDaysAgo)
    .lt("updated_at", twoDaysAgo)
    .not("customer_id", "is", null)
    .limit(100);

  const rows = (jobs ?? []) as JobRow[];
  let created = 0;
  let skipped = 0;

  const bizCache = new Map<string, string>();

  for (const j of rows) {
    if ((j.description ?? "").includes(TAG)) { skipped++; continue; }
    if (!j.customer_id) { skipped++; continue; }

    const { data: cust } = await admin
      .from("customers").select("id,name").eq("id", j.customer_id).maybeSingle();
    const c = cust as CustRow | null;
    const firstName = c?.name?.split(" ")[0] ?? "there";

    if (!bizCache.has(j.user_id)) {
      const { data: prof } = await admin
        .from("profiles").select("business_name").eq("id", j.user_id).maybeSingle();
      bizCache.set(j.user_id, (prof as BizRow | null)?.business_name ?? "");
    }
    const biz = bizCache.get(j.user_id) ?? "";

    let note = "";
    if (client) {
      try {
        const res = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: SYSTEM,
          messages: [{
            role: "user",
            content: `Customer first name: ${firstName}\nJob: ${j.title}\nMy business: ${biz}`,
          }],
        });
        const text = res.content.find((b) => b.type === "text");
        if (text && text.type === "text") note = text.text.trim().slice(0, 240);
      } catch { /* fall through */ }
    }
    if (!note) {
      note = `Hey ${firstName} — wanted to thank you again for the ${j.title.toLowerCase()} work this week. Means a lot you trusted us with it. Reach out anytime.`;
    }

    const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await admin.from("follow_ups").insert({
      user_id: j.user_id,
      job_id: j.id,
      customer_id: j.customer_id,
      title: `Send thank-you: ${j.title}`,
      notes: `Suggested text:\n\n${note}\n\n— Send via text or handwritten note. The human touch matters.`,
      due_at: dueAt,
    });

    await admin.from("jobs").update({
      description: `${j.description ?? ""}\n${TAG} ${new Date().toISOString().slice(0, 10)}`.trim(),
    }).eq("id", j.id);

    created++;
  }

  return NextResponse.json({ ok: true, considered: rows.length, created, skipped });
}

export async function POST(request: Request) { return GET(request); }
