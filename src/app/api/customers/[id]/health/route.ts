import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Customer health score (0-100). Composite of:
//   - Recency: how recently they had a job (closer = healthier)
//   - Frequency: how many jobs in last 12 months
//   - Payment timeliness: % of invoices paid on time
//   - NPS: latest score if any
//
// 80+ = champion, 50-79 = healthy, 30-49 = at-risk, <30 = lost.

interface JobRow { status: string; updated_at: string; created_at: string; }
interface InvoiceRow { status: string; due_at: string | null; paid_at: string | null; }
interface NpsRow { score: number; created_at: string; }

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const customerId = params.id;

  const [{ data: jobs }, { data: invoices }, { data: nps }] = await Promise.all([
    supabase.from("jobs")
      .select("status,updated_at,created_at")
      .eq("user_id", user.id).eq("customer_id", customerId),
    supabase.from("invoices")
      .select("status,due_at,paid_at")
      .eq("user_id", user.id).eq("customer_id", customerId),
    supabase.from("nps_responses")
      .select("score,created_at")
      .eq("user_id", user.id).eq("customer_id", customerId)
      .order("created_at", { ascending: false }).limit(1),
  ]);

  const jobList = (jobs ?? []) as JobRow[];
  const invList = (invoices ?? []) as InvoiceRow[];
  const npsLatest = ((nps ?? []) as NpsRow[])[0] ?? null;

  const now = Date.now();
  const completedJobs = jobList.filter((j) => j.status === "completed");
  const last12moJobs  = completedJobs.filter((j) =>
    now - new Date(j.updated_at).getTime() < 365 * 86_400_000);

  // Recency score (40 pts). Most-recent completed job:
  //   < 30 days  → 40
  //   30-90      → 30
  //   90-180     → 20
  //   180-365    → 10
  //   > 365      → 0
  let recency = 0;
  if (completedJobs.length > 0) {
    const lastAt = Math.max(...completedJobs.map((j) => new Date(j.updated_at).getTime()));
    const days = (now - lastAt) / 86_400_000;
    if (days < 30) recency = 40;
    else if (days < 90) recency = 30;
    else if (days < 180) recency = 20;
    else if (days < 365) recency = 10;
    else recency = 0;
  }

  // Frequency score (20 pts). Jobs in last 12 mo:
  //   3+ → 20, 2 → 14, 1 → 8, 0 → 0
  const frequency =
    last12moJobs.length >= 3 ? 20 :
    last12moJobs.length === 2 ? 14 :
    last12moJobs.length === 1 ? 8 : 0;

  // Payment timeliness (20 pts). % of paid invoices that were paid on/before due date.
  const paidInvoices = invList.filter((i) => i.status === "paid" && i.paid_at);
  const onTimeInvoices = paidInvoices.filter((i) =>
    i.due_at ? new Date(i.paid_at!).getTime() <= new Date(i.due_at).getTime() : true);
  const paymentScore = paidInvoices.length === 0
    ? 12
    : Math.round((onTimeInvoices.length / paidInvoices.length) * 20);

  // NPS score (20 pts). Latest response mapped:
  //   9-10 → 20, 7-8 → 14, 5-6 → 8, 0-4 → 0
  const npsScore = npsLatest
    ? (npsLatest.score >= 9 ? 20
        : npsLatest.score >= 7 ? 14
        : npsLatest.score >= 5 ? 8 : 0)
    : 10; // neutral if no NPS yet

  const total = recency + frequency + paymentScore + npsScore;
  const tier =
    total >= 80 ? "champion" :
    total >= 50 ? "healthy"  :
    total >= 30 ? "at-risk"  : "lost";

  return NextResponse.json({
    ok: true,
    total,
    tier,
    components: {
      recency: { value: recency, max: 40 },
      frequency: { value: frequency, max: 20 },
      payment: { value: paymentScore, max: 20 },
      nps: { value: npsScore, max: 20, last: npsLatest?.score ?? null },
    },
    metadata: {
      completed_jobs: completedJobs.length,
      jobs_last_12mo: last12moJobs.length,
      paid_invoices: paidInvoices.length,
      on_time_invoices: onTimeInvoices.length,
    },
  });
}
