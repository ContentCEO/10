import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Camera, CheckCircle2, DollarSign, FileText, Hammer, MessageSquare,
  Phone, Sparkles, UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Customer { id: string; name: string; created_at: string; }

interface TimelineEvent {
  at: string;
  kind: "customer_created" | "lead_created" | "lead_won" | "job_created"
      | "job_completed" | "invoice_paid" | "proposal_sent" | "proposal_signed"
      | "nps_response" | "follow_up" | "call" | "photo";
  label: string;
  detail?: string;
  href?: string;
  amount?: number;
  icon: typeof UserPlus;
}

const KIND_TONE: Record<TimelineEvent["kind"], string> = {
  customer_created: "bg-ink-100 text-ink-600",
  lead_created:     "bg-brand-100 text-brand-700",
  lead_won:         "bg-emerald-100 text-emerald-700",
  job_created:      "bg-violet-100 text-violet-700",
  job_completed:    "bg-emerald-100 text-emerald-700",
  invoice_paid:     "bg-emerald-100 text-emerald-700",
  proposal_sent:    "bg-amber-100 text-amber-700",
  proposal_signed:  "bg-emerald-100 text-emerald-700",
  nps_response:     "bg-cyan-100 text-cyan-700",
  follow_up:        "bg-brand-100 text-brand-700",
  call:             "bg-violet-100 text-violet-700",
  photo:            "bg-pink-100 text-pink-700",
};

export default async function CustomerTimelinePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers").select("id,name,created_at")
    .eq("id", params.id).eq("user_id", user.id).single();
  if (!customer) notFound();
  const c = customer as Customer;

  const [
    { data: leads }, { data: jobs }, { data: invoices },
    { data: proposals }, { data: nps }, { data: followUps },
    { data: calls }, { data: photos },
  ] = await Promise.all([
    supabase.from("leads").select("id,name,status,created_at,updated_at")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("jobs").select("id,title,status,created_at,updated_at,price")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("invoices").select("id,number,amount_cents,paid_at,status")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("proposals").select("id,title,status,sent_at,customer_signature_at,total_cents")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("nps_responses").select("score,comment,created_at")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("follow_ups").select("id,title,completed_at,due_at")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("call_log").select("id,direction,outcome,called_at,notes")
      .eq("customer_id", c.id).eq("user_id", user.id),
    supabase.from("job_photos").select("id,job_id,phase,caption,taken_at")
      .in("job_id", []), // populated below
  ]);

  const events: TimelineEvent[] = [];

  events.push({
    at: c.created_at, kind: "customer_created",
    label: "Customer created",
    icon: UserPlus,
  });

  for (const l of (leads ?? []) as { id: string; name: string; status: string; created_at: string; updated_at: string }[]) {
    events.push({ at: l.created_at, kind: "lead_created",
      label: `Lead created: ${l.name}`, href: `/leads/${l.id}`, icon: Sparkles });
    if (l.status === "won") {
      events.push({ at: l.updated_at, kind: "lead_won",
        label: `Lead won: ${l.name}`, href: `/leads/${l.id}`, icon: CheckCircle2 });
    }
  }

  for (const j of (jobs ?? []) as { id: string; title: string; status: string; created_at: string; updated_at: string; price: number | null }[]) {
    events.push({ at: j.created_at, kind: "job_created",
      label: `Job created: ${j.title}`, href: `/jobs/${j.id}`, amount: j.price ?? undefined, icon: Hammer });
    if (j.status === "completed") {
      events.push({ at: j.updated_at, kind: "job_completed",
        label: `Job completed: ${j.title}`, href: `/jobs/${j.id}`, amount: j.price ?? undefined, icon: CheckCircle2 });
    }
  }

  for (const i of (invoices ?? []) as { id: string; number: string | null; amount_cents: number; paid_at: string | null; status: string }[]) {
    if (i.paid_at) {
      events.push({ at: i.paid_at, kind: "invoice_paid",
        label: `Invoice ${i.number ?? ""} paid`,
        amount: i.amount_cents / 100, icon: DollarSign });
    }
  }

  for (const p of (proposals ?? []) as { id: string; title: string; status: string; sent_at: string | null; customer_signature_at: string | null; total_cents: number }[]) {
    if (p.sent_at) {
      events.push({ at: p.sent_at, kind: "proposal_sent",
        label: `Proposal sent: ${p.title}`, amount: p.total_cents / 100, icon: FileText });
    }
    if (p.customer_signature_at) {
      events.push({ at: p.customer_signature_at, kind: "proposal_signed",
        label: `Proposal signed: ${p.title}`, amount: p.total_cents / 100, icon: CheckCircle2 });
    }
  }

  for (const n of (nps ?? []) as { score: number; comment: string | null; created_at: string }[]) {
    events.push({ at: n.created_at, kind: "nps_response",
      label: `NPS score: ${n.score}/10`, detail: n.comment ?? undefined, icon: MessageSquare });
  }

  for (const f of (followUps ?? []) as { id: string; title: string; completed_at: string | null; due_at: string }[]) {
    if (f.completed_at) {
      events.push({ at: f.completed_at, kind: "follow_up",
        label: `Follow-up done: ${f.title}`, icon: CheckCircle2 });
    }
  }

  for (const c2 of (calls ?? []) as { id: string; direction: string; outcome: string; called_at: string; notes: string | null }[]) {
    events.push({ at: c2.called_at, kind: "call",
      label: `${c2.direction === "outbound" ? "Called" : "Received call from"}: ${c2.outcome.replace("_", " ")}`,
      detail: c2.notes ?? undefined, icon: Phone });
  }

  // Photos linked through job_id — we already have job ids
  const customerJobIds = ((jobs ?? []) as { id: string }[]).map((j) => j.id);
  if (customerJobIds.length > 0) {
    const { data: jobPhotos } = await supabase
      .from("job_photos").select("id,job_id,phase,caption,taken_at")
      .in("job_id", customerJobIds);
    for (const p of (jobPhotos ?? []) as { id: string; job_id: string; phase: string | null; caption: string | null; taken_at: string }[]) {
      events.push({ at: p.taken_at, kind: "photo",
        label: `Photo${p.phase ? ` (${p.phase})` : ""}`,
        detail: p.caption ?? undefined,
        href: `/jobs/${p.job_id}`, icon: Camera });
    }
  }
  void photos;

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href={`/customers/${c.id}`} className="text-sm text-ink-500 hover:text-brand-600">← {c.name}</Link>
      </div>

      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow">Customer · Timeline</span>
          <h1 className="mt-2 display-h2">
            <em>{c.name}</em>&apos;s journey
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Every touchpoint, in reverse chronological order.{" "}
            <span className="font-mono tabular-nums text-ink-700">{events.length}</span> events.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <ol className="relative border-l-2 border-ink-200 ml-3 space-y-4">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <li key={i} className="ml-6 relative">
                <span className={`absolute -left-9 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${KIND_TONE[e.kind]}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="text-sm">
                  {e.href ? (
                    <Link href={e.href} className="font-medium text-ink-900 hover:text-brand-600">{e.label}</Link>
                  ) : (
                    <span className="font-medium text-ink-900">{e.label}</span>
                  )}
                  {e.amount != null && (
                    <span className="ml-2 text-emerald-700 font-mono tabular-nums">${Math.round(e.amount).toLocaleString()}</span>
                  )}
                </div>
                {e.detail && <p className="text-xs text-ink-600 italic mt-0.5">{e.detail}</p>}
                <div className="text-[10px] text-ink-400 tabular-nums font-mono mt-0.5">
                  {new Date(e.at).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
