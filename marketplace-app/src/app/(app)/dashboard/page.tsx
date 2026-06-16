import Link from "next/link";
import { Filter, Sliders, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRADES, classifyTrade } from "@/lib/trades";
import { type MarketplaceLead } from "@/lib/marketplace";
import { MarketplaceCard } from "./MarketplaceCard";

export const dynamic = "force-dynamic";

const EMERALD = "#10b981";

export default async function DashboardPage({ searchParams }: { searchParams: { welcome?: string; trade?: string; service?: string; zip?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = admin
    .from("marketplace_leads")
    .select("*")
    .eq("status", "available")
    .gte("created_at", sinceIso)
    .not("name", "is", null)
    .not("phone", "is", null)
    .neq("name", "")
    .neq("phone", "")
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (searchParams.service) query = query.ilike("service_type", `%${searchParams.service}%`);
  if (searchParams.zip)     query = query.eq("zip", searchParams.zip);

  const { data: leads } = await query;
  const rawRows = (leads ?? []) as MarketplaceLead[];

  const tradeFilter = searchParams.trade;
  const rows = rawRows.filter((r) => {
    if (tradeFilter) {
      const blob = [r.service_type, r.ai_summary, r.notes].filter(Boolean).join(" \n ");
      return classifyTrade(blob) === tradeFilter;
    }
    return true;
  });

  const welcome = searchParams.welcome === "1";
  const hotCount   = rows.filter((r) => r.ai_score >= 85).length;
  const freshCount = rows.filter((r) => (Date.now() - new Date(r.created_at).getTime()) < 60 * 60 * 1000).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {welcome && (
        <div className="rounded-2xl p-5"
          style={{ background: `${EMERALD}14`, border: `1px solid ${EMERALD}40` }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: `${EMERALD}22`, color: EMERALD }}>
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-white">Welcome to Marketplace 🎉</div>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                You&apos;re on a 7-day free trial. Set your trade + ZIP preferences to start receiving matching leads.
              </p>
              <Link href="/preferences"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: EMERALD }}>
                <Sliders className="h-3 w-3" /> Set preferences
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ───── HERO — emerald-themed marketplace identity ─────────── */}
      <header className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(900px 320px at 80% -20%, rgba(16,185,129,0.32), transparent 60%)," +
            "radial-gradient(700px 320px at -10% 110%, rgba(5,150,105,0.20), transparent 60%)," +
            "rgba(255,255,255,0.025)",
          border: "1px solid rgba(16,185,129,0.22)",
          boxShadow: "0 20px 60px -28px rgba(16,185,129,0.45)",
        }}>
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] mb-2"
              style={{ color: "#6ee7b7" }}>
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live · Lead marketplace
            </div>
            <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1.0, letterSpacing: "-0.025em", color: "#fff" }}>
              Real <em style={{
                fontStyle: "italic",
                background: "linear-gradient(135deg, #34d399, #10b981)",
                WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>MA homeowner</em> leads.
            </h1>
            <p className="mt-3 text-sm max-w-md" style={{ color: "rgba(255,255,255,0.65)" }}>
              Fresh, AI-scored project requests. Tap any lead to see full details + claim. Each lead is exclusive — yours alone.
            </p>
          </div>

          {/* Hero stats — 3 tiles */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <StatTile label="Available" value={String(rows.length)} accent="#10b981" />
            <StatTile label="Hot now"   value={String(hotCount)}    accent="#fb7185" pulse={hotCount > 0} />
            <StatTile label="Fresh <1h" value={String(freshCount)}  accent="#34d399" />
          </div>
        </div>
      </header>

      {/* Trade pills */}
      <div className="flex flex-wrap gap-1.5 sticky top-14 lg:top-0 z-10 -mx-1 px-1 py-2 backdrop-blur-md"
        style={{ background: "rgba(6,6,10,0.65)" }}>
        <Link href="/dashboard"
          className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
          style={!tradeFilter
            ? { background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.40)", color: "#a7f3d0" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}>
          All trades
        </Link>
        {TRADES.map((t) => (
          <Link key={t.slug} href={`/dashboard?trade=${t.slug}`}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
            style={tradeFilter === t.slug
              ? { background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.40)", color: "#a7f3d0", fontWeight: 600 }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}>
            {t.labelPlural}
          </Link>
        ))}
      </div>

      {/* Filter form */}
      <form className="rounded-2xl p-4 grid sm:grid-cols-[1fr_140px_auto] gap-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        action="/dashboard">
        {tradeFilter && <input type="hidden" name="trade" value={tradeFilter} />}
        <input name="service" defaultValue={searchParams.service ?? ""}
          className="rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 text-white placeholder:text-white/40"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
          placeholder="Filter by service (e.g. kitchen, roof, painting)" />
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 text-white placeholder:text-white/40"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
          placeholder="ZIP" inputMode="numeric" />
        <button className="inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 20px -8px rgba(16,185,129,0.7)" }}>
          Filter
        </button>
      </form>

      {/* Available leads grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Available now</h2>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Sorted by AI score · then freshness</span>
        </div>

        {rows.length ? (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((l) => (
              <MarketplaceCard key={l.id} lead={l} />
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl p-12 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(16,185,129,0.25)" }}>
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-4"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 10px 24px -10px rgba(16,185,129,0.8)" }}>
              <Store className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-white">No leads match this view.</h3>
            <p className="mt-2 text-sm max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Adjust your filters above, widen your preferences, or wait for the scrapers — fresh leads land every few minutes.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)", color: "#a7f3d0" }}>
                Show all leads
              </Link>
              <Link href="/preferences"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.75)" }}>
                <Filter className="h-3 w-3" /> Edit preferences
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value, accent, pulse }: {
  label: string; value: string; accent: string; pulse?: boolean;
}) {
  return (
    <div className="rounded-2xl p-3 min-w-[110px]"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}33` }}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider"
        style={{ color: accent }}>
        {pulse && (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent }} />
            <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          </span>
        )}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-white mt-1 leading-none">{value}</div>
    </div>
  );
}
