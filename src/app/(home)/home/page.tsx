import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Sparkles, Users, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUDGET_LABELS, TIMELINE_LABELS, type MarketplaceLead } from "@/lib/marketplace";
import { formatDate } from "@/lib/utils";
import { NewRequestForm } from "./NewRequestForm";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<MarketplaceLead["status"], string> = {
  available: "bg-amber-100 text-amber-800 ring-amber-200",
  sold:      "bg-emerald-100 text-emerald-700 ring-emerald-200",
  expired:   "bg-slate-100 text-slate-500 ring-slate-200",
};

const STATUS_LABEL: Record<MarketplaceLead["status"], string> = {
  available: "Awaiting contractor",
  sold:      "Matched with a pro",
  expired:   "Expired",
};

export default async function HomeownerHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("marketplace_leads")
    .select("*")
    .eq("email", user.email ?? "__never__")
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (requests ?? []) as MarketplaceLead[];

  return (
    <div className="space-y-6">
      <section className="grid sm:grid-cols-2 gap-3">
        <Link href="/pros" className="card card-hover p-5 flex items-center gap-3 bg-brand-50 border-brand-100">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">
            <Users className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Browse pros</div>
            <div className="text-xs text-slate-600">
              Vetted contractors with credentials + reviews.
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-brand-600" />
        </Link>
        <Link href="/portal" className="card card-hover p-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow shrink-0">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">My service portal</div>
            <div className="text-xs text-slate-600">
              See your jobs, invoices, and payments.
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Find a contractor</h1>
            <p className="text-sm text-slate-500 mt-1">
              Tell us about your project — local pros will reach out with quotes.
              100% free for you, no obligation.
            </p>
          </div>
        </div>
        <NewRequestForm defaultEmail={user.email ?? ""} />
      </section>

      <section>
        <h2 className="font-semibold mb-3">Your requests</h2>
        {rows.length ? (
          <ul className="card divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.service_type}</div>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{BUDGET_LABELS[r.budget]}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {TIMELINE_LABELS[r.timeline]}
                    </span>
                    <span>{[r.city, r.zip].filter(Boolean).join(" · ") || "—"}</span>
                    <span>Submitted {formatDate(r.created_at)}</span>
                  </div>
                </div>
                <span className={`badge shrink-0 ${STATUS_TONE[r.status]}`}>
                  {r.status === "sold" ? (
                    <UserCheck className="h-3 w-3 mr-1" />
                  ) : r.status === "expired" ? null : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center text-sm text-slate-500">
            No requests yet. Submit one above to get matched with local pros.
          </div>
        )}
      </section>

      <section className="card p-6">
        <h3 className="font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          How it works
        </h3>
        <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Tell us what you need done, your budget, and your timeline.</li>
          <li>Local, vetted contractors see your request and reach out with quotes.</li>
          <li>Compare quotes, pick the pro you like, and get to work — no fees to you.</li>
        </ol>
      </section>
    </div>
  );
}
