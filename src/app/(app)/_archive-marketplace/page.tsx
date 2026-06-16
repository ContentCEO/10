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
  const hotCount = rows.filter((r) => r.ai_score >= 80).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <span className="section-eyebrow"><Store className="h-3.5 w-3.5" /> Marketplace</span>
            <h1 className="mt-2 display-h2">Lead marketplace</h1>
            <p className="mt-2 text-sm text-ink-600">
              Fresh homeowner project requests, scored by AI. Claim a lead — your wallet
              is charged automatically.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
                {rows.length} available
              </span>
              {hotCount > 0 && (
                <span className="badge bg-rose-100 text-rose-700 ring-rose-200">
                  🔥 {hotCount} hot
                </span>
              )}
            </div>
          </div>
          <a href="/find-pro" target="_blank" rel="noreferrer" className="btn-secondary hidden sm:inline-flex shrink-0">
            <Sparkles className="h-4 w-4" /> Homeowner view
          </a>
        </div>
      </header>

      {searchParams.topup === "success" && (
        <div className="card p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-sm">
          ✅ Top-up successful! Your wallet will reflect the new balance once Stripe finishes processing
          (usually a few seconds). Refresh if you don&apos;t see it yet.
        </div>
      )}

      {(prefsActive || filtersOff) && (
        <div className={`card p-4 flex items-start gap-3 ${
          filtersOff ? "bg-amber-500/[0.08] ring-1 ring-amber-400/30" : "bg-emerald-500/[0.06] ring-1 ring-emerald-400/25"
        }`}>
          <Sliders className={`h-4 w-4 mt-0.5 shrink-0 ${filtersOff ? "text-amber-300" : "text-emerald-300"}`} />
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

      <div className="flex flex-wrap gap-1.5">
        <Link href="/marketplace"
          className={!tradeFilter
            ? "inline-flex items-center rounded-full bg-brand-500/20 ring-1 ring-brand-400/40 text-brand-100 px-3 py-1.5 text-xs font-semibold"
            : "inline-flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/10 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/[0.08]"}>
          All trades
        </Link>
        {TRADES.map((t) => (
          <Link key={t.slug} href={`/marketplace?trade=${t.slug}`}
            className={tradeFilter === t.slug
              ? "inline-flex items-center rounded-full bg-brand-500/20 ring-1 ring-brand-400/40 text-brand-100 px-3 py-1.5 text-xs font-semibold"
              : "inline-flex items-center rounded-full bg-white/[0.04] ring-1 ring-white/10 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/[0.08]"}>
            {t.labelPlural}
          </Link>
        ))}
      </div>

      <form className="card p-4 grid sm:grid-cols-[1fr_140px_auto] gap-2" action="/marketplace">
        {tradeFilter && <input type="hidden" name="trade" value={tradeFilter} />}
        <input name="service" defaultValue={searchParams.service ?? ""}
          className="input" placeholder="Filter by service (e.g. kitchen, roof, clean)" />
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="input" placeholder="ZIP" inputMode="numeric" />
        <button className="btn-primary">Filter</button>
      </form>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Available now</h2>
          <span className="text-xs text-ink-500">Sorted by AI score</span>
        </div>

        {rows.length ? (
          <ul className="grid md:grid-cols-2 gap-4">
            {rows.map((l) => (
              <MarketplaceCard key={l.id} lead={l} balanceCents={balance} />
            ))}
          </ul>
        ) : (
          <div className="card p-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow mb-4">
              <Store className="h-6 w-6" />
            </div>
            <p className="text-sm text-ink-600 max-w-sm mx-auto">
              No leads match that filter right now. Try the <strong>Seed samples</strong> button
              above to generate 5 AI-crafted sample leads for testing.
            </p>
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <section>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Your claimed leads
          </h2>
          <ul className="card divide-y divide-ink-100">
            {mine.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-ink-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{l.name} · {l.service_type}</div>
                  <div className="text-xs text-ink-500">
                    {[l.city, l.zip].filter(Boolean).join(" · ") || "—"} ·
                    Claimed {l.bought_at ? formatDate(l.bought_at) : "—"} ·
                    {" "}<span className="tabular-nums font-medium text-ink-700">{money(l.price_cents)}</span>
                  </div>
                  <DisputeButton leadId={l.id} />
                </div>
                <Link href={`/leads?source=Marketplace`} className="btn-secondary !py-1.5 text-xs shrink-0">
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
