import Link from "next/link";
import {
  Activity, AlertCircle, Bot, Building2, CheckCircle2,
  CircleDollarSign, MessageSquare, ShoppingCart, Sparkles, Users,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ScraperRun {
  source: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  error: string | null;
  ran_at: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  business_name: string | null;
  account_type: string;
  subscription_status: string | null;
  credit_cents: number | null;
  created_at: string;
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();

  const [
    { count: totalUsers },
    { count: totalContractors },
    { count: totalHomeowners },
    { count: totalEmployees },
    { count: totalLeads },
    { count: totalCustomers },
    { count: totalJobs },
    { count: totalInvoices },
    { count: marketplaceAvailable },
    { count: marketplaceSold },
    { data: signupsLast7 },
    { data: topUsers },
    { data: recentRuns },
    { data: walletAgg },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "contractor"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "homeowner"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "employee"),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin.from("jobs").select("id", { count: "exact", head: true }),
    admin.from("invoices").select("id", { count: "exact", head: true }),
    admin.from("marketplace_leads").select("id", { count: "exact", head: true }).eq("status", "available"),
    admin.from("marketplace_leads").select("id", { count: "exact", head: true }).eq("status", "sold"),
    admin.from("profiles").select("id,email,business_name,account_type,created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false }).limit(10),
    admin.from("profiles").select("id,email,business_name,account_type,subscription_status,credit_cents,created_at")
      .eq("account_type", "contractor")
      .order("credit_cents", { ascending: false }).limit(8),
    admin.from("scraper_runs").select("source,fetched,inserted,duplicates,error,ran_at")
      .gte("ran_at", since).order("ran_at", { ascending: false }).limit(40),
    admin.from("wallet_transactions").select("amount_cents,kind")
      .gte("created_at", since),
  ]);

  const runList = (recentRuns ?? []) as ScraperRun[];
  const topupTotal = ((walletAgg ?? []) as { amount_cents: number; kind: string }[])
    .filter((w) => w.kind === "topup")
    .reduce((s, w) => s + w.amount_cents, 0);
  const claimTotal = ((walletAgg ?? []) as { amount_cents: number; kind: string }[])
    .filter((w) => w.kind === "claim")
    .reduce((s, w) => s + Math.abs(w.amount_cents), 0);

  // Aggregate scraper stats
  const scraperStats: Record<string, { runs: number; inserted: number; lastRun: string | null; lastError: string | null }> = {};
  for (const r of runList) {
    const s = scraperStats[r.source] ?? { runs: 0, inserted: 0, lastRun: null, lastError: null };
    s.runs++;
    s.inserted += r.inserted;
    if (!s.lastRun || r.ran_at > s.lastRun) {
      s.lastRun = r.ran_at;
      s.lastError = r.error;
    }
    scraperStats[r.source] = s;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Owner overview</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-account platform health and activity.</p>
      </header>

      {/* Top KPI tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Total users" value={String(totalUsers ?? 0)} tone="from-indigo-500 to-violet-500" icon={Users} />
        <Tile label="Contractors" value={String(totalContractors ?? 0)} tone="from-violet-500 to-fuchsia-500" icon={Building2} />
        <Tile label="Available leads"
              value={String(marketplaceAvailable ?? 0)}
              sub={`${marketplaceSold ?? 0} sold lifetime`}
              tone="from-emerald-500 to-teal-500" icon={ShoppingCart} />
        <Tile label="GMV last 30d"
              value={`$${(topupTotal / 100).toFixed(0)}`}
              sub={`${claimTotal > 0 ? `$${(claimTotal / 100).toFixed(0)} claims` : "no claims yet"}`}
              tone="from-amber-500 to-orange-500" icon={CircleDollarSign} />
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <SmallStat label="Homeowners" value={totalHomeowners ?? 0} />
        <SmallStat label="Employees" value={totalEmployees ?? 0} />
        <SmallStat label="Pipeline leads" value={totalLeads ?? 0} />
        <SmallStat label="Customers" value={totalCustomers ?? 0} />
        <SmallStat label="Active jobs" value={totalJobs ?? 0} />
        <SmallStat label="Invoices" value={totalInvoices ?? 0} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" /> New signups (last 7 days)
          </h2>
          {(signupsLast7 ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No new signups this week.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {((signupsLast7 ?? []) as ProfileRow[]).map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p.business_name ?? p.email ?? "Anonymous"}</div>
                    <div className="text-xs text-slate-500">{p.email} · {p.account_type}</div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(p.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600" /> Top contractors by wallet
          </h2>
          {(topUsers ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No contractor accounts yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {((topUsers ?? []) as ProfileRow[]).map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.business_name ?? "Unnamed"}</div>
                    <div className="text-xs text-slate-500 truncate">{p.email}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium">${((p.credit_cents ?? 0) / 100).toFixed(0)}</div>
                    <div className="text-xs text-slate-500">{p.subscription_status ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-600" /> Scraper health (last 30 days)
        </h2>
        {Object.keys(scraperStats).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No scraper runs in the last 30 days. The cron may not have fired yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 text-left">
                <th className="font-medium py-1.5">Source</th>
                <th className="font-medium py-1.5 text-right">Runs</th>
                <th className="font-medium py-1.5 text-right">Inserted</th>
                <th className="font-medium py-1.5">Last run</th>
                <th className="font-medium py-1.5">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(scraperStats).map(([source, s]) => (
                <tr key={source}>
                  <td className="py-2 font-medium">{source}</td>
                  <td className="py-2 text-right">{s.runs}</td>
                  <td className="py-2 text-right text-emerald-700">{s.inserted}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {s.lastRun ? new Date(s.lastRun).toLocaleString() : "—"}
                  </td>
                  <td className="py-2">
                    {s.lastError
                      ? <span className="badge bg-rose-100 text-rose-700 ring-rose-200"><AlertCircle className="h-3 w-3 mr-1" /> {s.lastError.slice(0, 40)}</span>
                      : <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-600" /> Quick links
        </h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <Link href="/admin/users" className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">All users →</Link>
          <Link href="/admin/marketplace" className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">All marketplace leads →</Link>
          <Link href="/opportunities" className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">Opportunities feed →</Link>
          <Link href="/api/diagnostics" className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">Run diagnostics →</Link>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, sub, tone, icon: Icon }: {
  label: string; value: string; sub?: string; tone: string; icon: typeof Activity;
}) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="relative z-10 mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className="relative z-10 text-xs text-white/80 mt-1">{sub}</div>}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
