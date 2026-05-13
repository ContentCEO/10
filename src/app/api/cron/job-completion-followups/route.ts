import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Job-completion follow-ups. For every job that completed in the last
// 24h and hasn't already had a "post about this" reminder created,
// we draft a Google Business Profile post and stuff it into a
// follow_up row. The contractor sees it in "Due today" and pastes
// the text straight into Google.
//
// Cheap free-marketing automation: every completed job becomes a
// GBP post draft. No AI cost — pure template substitution.

interface JobRow {
  id: string;
  user_id: string;
  title: string;
  customer_id: string | null;
  description: string | null;
  updated_at: string;
}
interface CustomerRow {
  id: string;
  user_id: string;
  address: string | null;
  city: string | null;
}

function draftPost(jobTitle: string, city: string | null): string {
  const svc = jobTitle.toLowerCase();
  const where = city ?? "the area";
  return `📌 GBP post draft — paste into your Google Business Profile

Just wrapped a ${svc} in ${where} — another happy homeowner.

What we focused on:
✓ Clean job-site every day
✓ On-time finish, on budget
✓ 1-year labor warranty in writing

Thinking about ${svc}? Tap below for a free same-day quote.`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find jobs completed in the last 24h.
  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,title,customer_id,description,updated_at")
    .eq("status", "completed")
    .gte("updated_at", cutoff)
    .limit(200);

  const completed = (jobs ?? []) as JobRow[];
  if (completed.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, created: 0 });
  }

  // Skip the ones we already drafted for.
  const jobIds = completed.map((j) => j.id);
  const { data: existing } = await admin
    .from("follow_ups").select("job_id")
    .in("job_id", jobIds)
    .ilike("title", "Post on Google: %");
  const alreadyDone = new Set((existing ?? []).map((r: { job_id: string | null }) => r.job_id).filter(Boolean));

  // Pull cities for the ones with customers.
  const customerIds = completed
    .map((j) => j.customer_id)
    .filter((id): id is string => !!id);
  let cityById = new Map<string, string | null>();
  if (customerIds.length > 0) {
    const { data: customers } = await admin
      .from("customers").select("id,city").in("id", customerIds);
    cityById = new Map(((customers ?? []) as Pick<CustomerRow, "id" | "city">[])
      .map((c) => [c.id, c.city]));
  }

  // Schedule the draft 1h from now (gives contractor time to take photos).
  const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  let created = 0;
  for (const j of completed) {
    if (alreadyDone.has(j.id)) continue;
    const city = j.customer_id ? cityById.get(j.customer_id) ?? null : null;
    const draft = draftPost(j.title, city);
    const { error } = await admin.from("follow_ups").insert({
      user_id: j.user_id,
      job_id: j.id,
      title: `Post on Google: ${j.title}`,
      notes: draft,
      due_at: dueAt,
    });
    if (!error) created++;
  }

  return NextResponse.json({
    ok: true,
    considered: completed.length,
    already_done: alreadyDone.size,
    created,
  });
}

export async function POST(request: Request) { return GET(request); }
