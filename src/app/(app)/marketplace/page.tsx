import Link from "next/link";
import { ShoppingCart, Sliders, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { type MarketplaceLead } from "@/lib/marketplace";
import { formatDate } from "@/lib/utils";
import { isOwnerEmail } from "@/lib/owner";
import { isQualifiedLead, MAX_LEAD_AGE_DAYS } from "@/lib/lead-quality";
import { TRADES, classifyTrade } from "@/lib/trades";
import { DisputeButton } from "./DisputeButton";
import { WalletBar } from "./WalletBar";
import { MarketplaceCard } from "./MarketplaceCard";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

interface MarketplacePrefs {
  trades: string[];
  zips: string[];
  min_budget_cents: number;
}

// Parse "$2k-$10k" style budget strings into a cents number for comparison.
// Returns null when we can't extract a min boundary, in which case the
// preference filter conservatively keeps the lead.
function budgetMinCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.replace(/[, ]/g, "").match(/\$?(\d+)(k|K)?/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  return (m[2] ? n * 1000 : n) * 100;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { service?: string; zip?: string; topup?: string; trade?: string; nofilter?: string };
}) {
  await requireModule("cf-marketplace");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Owner + admins see uncurated scraped leads too; everyone else gets
  // the curated firehose. This is what makes the scraped pipeline
  // visible in /marketplace immediately for the platform owner.
  const { data: viewerProfile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const seeAll = isOwnerEmail(user.email) || Boolean((viewerProfile as { is_admin?: boolean } | null)?.is_admin);

  // Filter (server-side): non-empty name + non-empty phone + status
  // available + created within the last 30 days. MA + contractor-intent
  // are applied below in JS via isQualifiedLead.
  const sinceIso = new Date(Date.now() - MAX_LEAD_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
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
    .limit(seeAll ? 1000 : 200);
  if (!seeAll) {
    query = query.or("requires_curation.is.null,requires_curation.eq.false");
  }

  if (searchParams.service) query = query.ilike("service_type", `%${searchParams.service}%`);
  if (searchParams.zip)     query = query.eq("zip", searchParams.zip);

  const [{ data: available }, { data: claimed }, { data: profile }, { data: prefsRow }] = await Promise.all([
    query,
    supabase.from("marketplace_leads").select("*")
      .eq("buyer_id", user.id)
      .order("bought_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("credit_cents").eq("id", user.id).single(),
    supabase.from("marketplace_preferences")
      .select("trades,zips,min_budget_cents")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const prefs = (prefsRow as MarketplacePrefs | null) ?? null;
  const filtersOff = searchParams.nofilter === "1";
  const prefsActive = !filtersOff && !!prefs && (
    (prefs.trades?.length ?? 0) > 0 || (prefs.zips?.length ?? 0) > 0 || (prefs.min_budget_cents ?? 0) > 0
  );

  // JS-side enforcement of MA + contractor-intent + freshness + optional trade filter
  // + the contractor's saved preferences (trades / zips / min budget).
  const rawRows = (available ?? []) as MarketplaceLead[];
  const tradeFilter = searchParams.trade;
  let hiddenByPrefs = 0;
  const rows = rawRows.filter((r) => {
    if (!isQualifiedLead({
      name: r.name, phone: r.phone, city: r.city, zip: r.zip,
      notes: r.notes, service_type: r.service_type, ai_summary: r.ai_summary,
      created_at: r.created_at,
    }).ok) return false;

    if (tradeFilter) {
      const blob = [r.service_type, r.ai_summary, r.notes].filter(Boolean).join(" \n ");
      if (classifyTrade(blob) !== tradeFilter) return false;
    }

    if (prefsActive && prefs) {
      // Trades filter — classify the lead and check membership.
      if (prefs.trades.length) {
        const blob = [r.service_type, r.ai_summary, r.notes].filter(Boolean).join(" \n ");
        const cls = classifyTrade(blob);
        if (!cls || !prefs.trades.includes(cls)) { hiddenByPrefs++; return false; }
      }
      // ZIP filter — exact string match against the lead's zip.
      if (prefs.zips.length && (!r.zip || !prefs.zips.includes(r.zip))) {
        hiddenByPrefs++;
        return false;
      }
      // Min budget — only enforce when both sides are present, otherwise keep.
      if (prefs.min_budget_cents > 0) {
        const minCents = budgetMinCents(r.budget);
        if (minCents !== null && minCents < prefs.min_budget_cents) {
          hiddenByPrefs++;
          return false;
        }
      }
    }
    return true;
  }).slice(0, seeAll ? 500 : 50);

  const mine    = (claimed ?? []) as MarketplaceLead[];
  const balance = profile?.credit_cents ?? 0;
  const hotCount   = rows.filter((r) => r.ai_score >= 85).length;
  const freshCount = rows.filter((r) => (Date.now() - new Date(r.created_at).getTime()) < 60 * 60 * 1000).length;
  const minePeriod = mine.filter((l) => {
    if (!l.bought_at) return false;
    return new Date(l.bought_at).getTime() > Date.now() - 30 * 24 * 3600 * 1000;
  }).length;

  return (
    <div className="space-y-6 max-w-6xl" style={{ ["--emerald" as never]: "#10b981" }}>
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
            <h1 className="display-h2">
              Real <em style={{
                fontStyle: "italic",
                background: "linear-gradient(135deg, #34d399, #10b981)",
                WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>MA homeowner</em> leads.
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-md">
              Fresh, AI-scored project requests. Claim a lead — your wallet is charged automatically. Each lead is yours alone.
            </p>
          </div>

          {/* Hero stats — 4 tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <StatTile label="Available" value={String(rows.length)} accent="#10b981" />
            <StatTile label="Hot now"   value={String(hotCount)}    accent="#fb7185" pulse={hotCount > 0} />
            <StatTile label="Fresh <1h" value={String(freshCount)}  accent="#34d399" />
            <StatTile label="Yours/30d" value={String(minePeriod)}  accent="#fcd34d" />
          </div>
        </div>
      </header>

      {searchParams.topup === "success" && (
        <div className="rounded-2xl p-4 text-sm"
          style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.35)", color: "#a7f3d0" }}>
          ✅ Top-up successful! Wallet updates within a few seconds.
        </div>
      )}

      {(prefsActive || filtersOff) && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: filtersOff ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.06)",
            border: filtersOff ? "1px solid rgba(245,158,11,0.30)" : "1px solid rgba(16,185,129,0.25)",
          }}>
          <Sliders className="h-4 w-4 mt-0.5 shrink-0" style={{ color: filtersOff ? "#fcd34d" : "#34d399" }} />
          <div className="flex-1 min-w-0 text-sm">
            {filtersOff ? (
              <div>
                <span className="text-amber-100 font-semibold">Preferences turned off</span>{" "}
                <span className="text-white/60">— showing every available lead.</span>{" "}
                <Link href="/marketplace" className="text-amber-200 underline hover:no-underline">Re-enable</Link>
              </div>
            ) : (
              <div className="text-white/80">
                <span className="text-emerald-200 font-semibold">Filtered to your preferences</span>{" "}
                {prefs && [
                  prefs.trades.length ? `${prefs.trades.length} ${prefs.trades.length === 1 ? "trade" : "trades"}` : null,
                  prefs.zips.length ? `${prefs.zips.length} ${prefs.zips.length === 1 ? "ZIP" : "ZIPs"}` : null,
                  prefs.min_budget_cents > 0 ? `≥ $${(prefs.min_budget_cents / 100).toLocaleString()}` : null,
                ].filter(Boolean).join(" · ")}
                {hiddenByPrefs > 0 && (
                  <span className="text-white/50"> · {hiddenByPrefs} hidden</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!filtersOff && (
              <Link href="/marketplace?nofilter=1" className="text-xs text-white/60 hover:text-white">
                Show all
              </Link>
            )}
            <Link href="/marketplace/preferences"
              className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] ring-1 ring-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
              <Sliders className="h-3 w-3" /> Edit
            </Link>
          </div>
        </div>
      )}

      <WalletBar balanceCents={balance} />

      {/* Trade pills — emerald-tinted */}
      <div className="flex flex-wrap gap-1.5 sticky top-0 z-10 -mx-1 px-1 py-2 backdrop-blur-md"
        style={{ background: "rgba(6,6,10,0.65)" }}>
        <Link href="/marketplace"
          className={!tradeFilter
            ? "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-emerald-400/40 text-emerald-100"
            : "inline-flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/10 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/[0.08]"}
          style={!tradeFilter ? { background: "rgba(16,185,129,0.18)" } : undefined}>
          All trades
        </Link>
        {TRADES.map((t) => (
          <Link key={t.slug} href={`/marketplace?trade=${t.slug}`}
            className={tradeFilter === t.slug
              ? "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-emerald-400/40 text-emerald-100"
              : "inline-flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/10 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/[0.08]"}
            style={tradeFilter === t.slug ? { background: "rgba(16,185,129,0.18)" } : undefined}>
            {t.labelPlural}
          </Link>
        ))}
      </div>

      {/* Filter form — emerald submit */}
      <form className="rounded-2xl p-4 grid sm:grid-cols-[1fr_140px_auto] gap-2 ring-1 ring-white/10 bg-white/[0.03]" action="/marketplace">
        {tradeFilter && <input type="hidden" name="trade" value={tradeFilter} />}
        <input name="service" defaultValue={searchParams.service ?? ""}
          className="rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/40 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          placeholder="Filter by service (e.g. kitchen, roof, painting)" />
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/40 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          placeholder="ZIP" inputMode="numeric" />
        <button className="inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 20px -8px rgba(16,185,129,0.7)" }}>
          Filter
        </button>
      </form>

      {/* Available leads grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-white">Available now</h2>
          <span className="text-xs text-white/45">Sorted by AI score · then freshness</span>
        </div>

        {rows.length ? (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((l) => (
              <MarketplaceCard key={l.id} lead={l} balanceCents={balance} />
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl p-12 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(16,185,129,0.25)" }}>
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-4"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 10px 24px -10px rgba(16,185,129,0.8)" }}>
              <Store className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-white">No leads match this view.</h3>
            <p className="mt-2 text-sm text-white/55 max-w-sm mx-auto">
              Adjust your filters above, widen your preferences, or wait for the scrapers — fresh leads land every few minutes.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link href="/marketplace?nofilter=1"
                className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-emerald-400/30 bg-emerald-500/10 text-emerald-100 px-4 py-2 text-xs font-semibold hover:bg-emerald-500/20">
                Show all leads
              </Link>
              <Link href="/marketplace/preferences"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] ring-1 ring-white/10 text-white/75 px-4 py-2 text-xs font-semibold hover:bg-white/[0.10]">
                <Sliders className="h-3 w-3" /> Edit preferences
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Your claimed leads */}
      {mine.length > 0 && (
        <section>
          <h2 className="section-title mb-4 flex items-center gap-2 text-white">
            <ShoppingCart className="h-4 w-4 text-emerald-300" /> Your claimed leads
            <span className="text-xs text-white/45 font-normal">({mine.length})</span>
          </h2>
          <ul className="rounded-2xl ring-1 ring-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
            {mine.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-white">{l.name} · {l.service_type}</div>
                  <div className="text-xs text-white/50">
                    {[l.city, l.zip].filter(Boolean).join(" · ") || "—"} ·
                    Claimed {l.bought_at ? formatDate(l.bought_at) : "—"} ·
                    {" "}<span className="tabular-nums font-medium text-emerald-300">{money(l.price_cents)}</span>
                  </div>
                  <DisputeButton leadId={l.id} />
                </div>
                <Link href={`/leads?source=Marketplace`}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] ring-1 ring-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 shrink-0">
                  Open in pipeline
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
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
