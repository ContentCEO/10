import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileText, Hammer, Receipt, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Customer-facing portal. Accessed by a long share_token URL only —
// no login. Read-only view of their open work + payments due.
//
// /portal/[token]
//
// (Marketing-light, matches our brand palette, mobile-first.)

interface Customer {
  id: string;
  user_id: string;
  name: string;
}
interface Job {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  price: number | null;
}
interface Proposal {
  id: string;
  title: string;
  status: string;
  total_cents: number;
  share_token: string;
  created_at: string;
}
interface Invoice {
  id: string;
  number: string | null;
  amount_cents: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
}
interface BusinessProfile {
  business_name: string | null;
  phone_public: string | null;
  website: string | null;
}

const STATUS_TONE: Record<string, string> = {
  scheduled:   "bg-brand-100 text-brand-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-ink-100 text-ink-500",
  draft:       "bg-ink-100 text-ink-600",
  sent:        "bg-amber-100 text-amber-700",
  signed:      "bg-emerald-100 text-emerald-700",
  declined:    "bg-rose-100 text-rose-700",
  paid:        "bg-emerald-100 text-emerald-700",
  void:        "bg-ink-100 text-ink-500",
};

function fmtUsd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default async function CustomerPortalPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: customerRow } = await admin
    .from("customers")
    .select("id,user_id,name")
    .eq("portal_token", params.token)
    .maybeSingle();

  const customer = customerRow as Customer | null;
  if (!customer) notFound();

  const [{ data: jobs }, { data: proposals }, { data: invoices }, { data: profile }] = await Promise.all([
    admin.from("jobs")
      .select("id,title,status,start_date,price")
      .eq("customer_id", customer.id)
      .order("start_date", { ascending: false })
      .limit(10),
    admin.from("proposals")
      .select("id,title,status,total_cents,share_token,created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin.from("invoices")
      .select("id,number,amount_cents,status,due_at,paid_at")
      .eq("customer_id", customer.id)
      .order("issued_at", { ascending: false })
      .limit(10),
    admin.from("profiles")
      .select("business_name,phone_public,website")
      .eq("id", customer.user_id)
      .maybeSingle(),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const propList = (proposals ?? []) as Proposal[];
  const invList = (invoices ?? []) as Invoice[];
  const biz = (profile ?? null) as BusinessProfile | null;

  const openInvoiceTotal = invList
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((s, i) => s + i.amount_cents, 0);
  const openJobs = jobList.filter((j) => j.status === "scheduled" || j.status === "in_progress");

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Brand header */}
      <header className="bg-white border-b border-ink-200/70">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white font-bold shadow-soft">
            CF
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-500">Portal · {biz?.business_name ?? "ContractorFlow"}</div>
            <h1 className="text-lg font-serif font-normal tracking-tight text-ink-900 truncate">
              Hi <em>{customer.name.split(" ")[0]}</em>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        {/* Quick summary tiles */}
        <section className="grid grid-cols-3 gap-3">
          <Tile label="Open jobs"     value={String(openJobs.length)} />
          <Tile label="Open balance"  value={fmtUsd(openInvoiceTotal)} />
          <Tile label="Proposals"     value={String(propList.length)} />
        </section>

        {/* Action: open proposals */}
        {propList.some((p) => p.status === "sent" || p.status === "draft") && (
          <section className="card p-5 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold">Proposals awaiting your review</h2>
            </div>
            <ul className="space-y-2">
              {propList.filter((p) => p.status === "sent" || p.status === "draft").map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white ring-1 ring-ink-200/70">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-ink-500 tabular-nums">{fmtUsd(p.total_cents)}</div>
                  </div>
                  <Link href={`/p/${p.share_token}`} className="btn-primary text-sm">
                    Review &amp; sign
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Jobs */}
        {jobList.length > 0 && (
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hammer className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold">Your jobs</h2>
            </div>
            <ul className="divide-y divide-ink-100">
              {jobList.map((j) => (
                <li key={j.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{j.title}</div>
                    {j.start_date && (
                      <div className="text-xs text-ink-500">
                        {new Date(j.start_date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${STATUS_TONE[j.status] ?? "bg-ink-100 text-ink-500"}`}>
                    {j.status === "in_progress" ? "in progress" : j.status}
                  </span>
                  {j.price ? <span className="text-sm tabular-nums font-mono shrink-0">{fmtUsd(Math.round(j.price * 100))}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Invoices */}
        {invList.length > 0 && (
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold">Invoices</h2>
            </div>
            <ul className="divide-y divide-ink-100">
              {invList.map((i) => (
                <li key={i.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {i.number ? `Invoice ${i.number}` : "Invoice"}
                    </div>
                    <div className="text-xs text-ink-500">
                      {i.paid_at ? (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> paid {new Date(i.paid_at).toLocaleDateString()}
                        </span>
                      ) : i.due_at ? (
                        `due ${new Date(i.due_at).toLocaleDateString()}`
                      ) : "—"}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_TONE[i.status] ?? "bg-ink-100 text-ink-500"}`}>{i.status}</span>
                  <span className="text-sm tabular-nums font-mono shrink-0">{fmtUsd(i.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {jobList.length === 0 && propList.length === 0 && invList.length === 0 && (
          <section className="card p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-ink-300 mb-3" />
            <h2 className="font-semibold mb-1">Nothing here yet</h2>
            <p className="text-sm text-ink-500 max-w-md mx-auto">
              When {biz?.business_name ?? "your contractor"} sends a proposal,
              schedules a job, or issues an invoice, it&apos;ll appear here.
            </p>
          </section>
        )}

        {/* Contractor contact footer */}
        {(biz?.phone_public || biz?.website) && (
          <footer className="text-center text-xs text-ink-500 pt-2 pb-6">
            Questions? Contact {biz.business_name ?? "your contractor"}
            {biz.phone_public && <> · <a href={`tel:${biz.phone_public}`} className="text-brand-600 font-medium">{biz.phone_public}</a></>}
            {biz.website && <> · <a href={biz.website} className="text-brand-600 font-medium">website</a></>}
          </footer>
        )}
      </main>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
