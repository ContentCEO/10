import Link from "next/link";
import { Activity, AlertTriangle, ChevronRight, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ContractorRow {
  user_id: string;
  email: string | null;
  business_name: string | null;
  jobs_won: number;
  revenue: number;
  leads_bought: number;
}

interface MarketplaceRow {
  id: string;
  service_type: string | null;
  city: string | null;
  price_cents: number;
  buyer_email: string | null;
  bought_at: string;
}

interface ChurnRow {
  user_id: string;
  email: string | null;
  business_name: string | null;
  last_activity: string | null;
}

const STALE_DAYS = 21;

export default async function AdminInsightsPage() {
  const admin = createAdminClient();
  const sinceWeek  = new Date(Date.now() - 7  * 86_400_000).toISOString();
  const since30day = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();

  // ── B-3 Top performers leaderboard (last 30 days) ──────────────────
  const { data: contractors } = await admin
    .from("profiles")
    .select("id,email,business_name")
    .eq("account_type", "contractor")
    .limit(200);

  const performers: ContractorRow[] = [];
  for (const c of (contractors ?? []) as Array<{ id: string; email: string | null; business_name: string | null }>) {
    const [{ count: jobsWon }, { data: jobs }, { count: leadsBought }] = await Promise.all([
      admin.from("jobs").select("id", { count: "exact", head: true })
        .eq("user_id", c.id).eq("status", "completed").gte("updated_at", since30day),
      admin.from("jobs").select("price").eq("user_id", c.id).eq("status", "completed").gte("updated_at", since30day),
      admin.from("marketplace_leads").select("id", { count: "exact", head: true })
        .eq("buyer_id", c.id).gte("bought_at", since30day),
    ]);
    const revenue = (jobs ?? []).reduce((s: number, j: { price: number | null }) => s + (j.price ?? 0), 0);
    if ((jobsWon ?? 0) > 0 || (leadsBought ?? 0) > 0) {
      performers.push({
        user_id: c.id, email: c.email, business_name: c.business_name,
        jobs_won: jobsWon ?? 0, revenue, leads_bought: leadsBought ?? 0,
      });
    }
  }
  performers.sort((a, b) => b.revenue - a.revenue);
  const top = performers.slice(0, 10);

  // ── B-10 Marketplace claim audit (last 7 days) ─────────────────────
  const { data: claimsRaw } = await admin
    .from("marketplace_leads")
    .select("id,service_type,city,price_cents,buyer_id,bought_at")
    .not("bought_by", "is", null)
    .gte("bought_at", sinceWeek)
    .order("bought_at", { ascending: false })
    .limit(30);

  const buyerIds = Array.from(new Set(((claimsRaw ?? []) as Array<{ buyer_id: string | null }>)
    .map((r) => r.buyer_id).filter(Boolean) as string[]));
  const { data: buyers } = buyerIds.length > 0
    ? await admin.from("profiles").select("id,email").in("id", buyerIds)
    : { data: [] };
  const buyerEmailById = new Map(((buyers ?? []) as Array<{ id: string; email: string | null }>).map((b) => [b.id, b.email]));

  const claims: MarketplaceRow[] = ((claimsRaw ?? []) as Array<{
    id: string; service_type: string | null; city: string | null; price_cents: number;
    buyer_id: string | null; bought_at: string;
  }>).map((r) => ({
    id: r.id, service_type: r.service_type, city: r.city,
    price_cents: r.price_cents,
    buyer_email: r.buyer_id ? (buyerEmailById.get(r.buyer_id) ?? null) : null,
    bought_at: r.bought_at,
  }));

  // ── B-6 Churn watchlist (no activity in 21 days) ───────────────────
  const { data: stale } = await admin
    .from("profiles")
    .select("id,email,business_name,updated_at")
    .eq("account_type", "contractor")
    .lt("updated_at", staleCutoff)
    .order("updated_at", { ascending: false })
    .limit(20);

  const churnList: ChurnRow[] = ((stale ?? []) as Array<{
    id: string; email: string | null; business_name: string | null; updated_at: string;
  }>).map((s) => ({
    user_id: s.id,
    email: s.email,
    business_name: s.business_name,
    last_activity: s.updated_at,
  }));

  // ── Funnel rollups (B-13 onboarding funnel proxy via signups → set business_name) ──
  const { count: totalSignups } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const { count: onboarded }   = await admin.from("profiles").select("id", { count: "exact", head: true }).not("business_name", "is", null);
  const { count: activeLast30 } = await admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since30day);
  const onboardedPct = totalSignups ? Math.round(((onboarded ?? 0) / totalSignups) * 100) : 0;
  const activePct    = totalSignups ? Math.round(((activeLast30 ?? 0) / totalSignups) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-slate-500">← Overview</Link>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" /> Insights
        </h1>
      </header>

      {/* Funnel */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Total signups"   value={String(totalSignups ?? 0)} tone="from-indigo-500 to-violet-500" icon={Users} />
        <Tile label="Onboarded"       value={`${onboarded ?? 0} (${onboardedPct}%)`} tone="from-emerald-500 to-teal-500" icon={TrendingUp} />
        <Tile label="Active · 30d"    value={`${activeLast30 ?? 0} (${activePct}%)`} tone="from-cyan-500 to-blue-500" icon={Activity} />
        <Tile label="Churn watchlist" value={String(churnList.length)} tone="from-amber-500 to-orange-500" icon={AlertTriangle} />
      </section>

      {/* Top performers */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" /> Top performers · last 30 days
          </h2>
          <span className="text-xs text-slate-500">{top.length} active</span>
        </div>
        {top.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">No contractor activity in the last 30 days.</div>
        ) : (
          <ol className="space-y-2">
            {top.map((c, i) => (
              <li key={c.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <span className="text-xs font-mono text-slate-400 w-5">{(i + 1).toString().padStart(2, "0")}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.business_name ?? c.email ?? c.user_id.slice(0, 8)}</div>
                  <div className="text-xs text-slate-500 truncate">{c.email}</div>
                </div>
                <div className="text-right text-xs whitespace-nowrap">
                  <div className="font-semibold tabular-nums">${c.revenue.toLocaleString()}</div>
                  <div className="text-slate-500 tabular-nums">{c.jobs_won} jobs · {c.leads_bought} leads</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Marketplace claim audit */}
      <section className="card p-5">
        <h2 className="font-semibold tracking-tight flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4 text-brand-600" /> Marketplace claims · last 7 days
        </h2>
        {claims.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">No marketplace claims in the last 7 days.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {claims.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center gap-3 text-sm">
                <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.service_type ?? "—"} · {c.city ?? "—"}</div>
                  <div className="text-xs text-slate-500 truncate">bought by {c.buyer_email ?? "(unknown)"} · {new Date(c.bought_at).toLocaleString()}</div>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">${(c.price_cents / 100).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Churn watchlist */}
      <section className="card p-5">
        <h2 className="font-semibold tracking-tight flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-600" /> Churn watchlist · no activity in {STALE_DAYS}+ days
        </h2>
        {churnList.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">All active contractors recently engaged. Good.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {churnList.map((c) => {
              const days = c.last_activity ? Math.floor((Date.now() - new Date(c.last_activity).getTime()) / 86_400_000) : "—";
              return (
                <li key={c.user_id} className="py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.business_name ?? c.email ?? c.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-500 truncate">{c.email}</div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-amber-700 shrink-0">{days}d stale</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon: typeof Activity }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-4 text-white shadow-glow`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-90 font-semibold">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/15" />
    </div>
  );
}
