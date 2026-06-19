import Link from "next/link";
import { Filter, Search, Sliders, Store, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRADES, classifyTrade } from "@/lib/trades";
import { type MarketplaceLead } from "@/lib/marketplace";
import { MarketplaceCard } from "./MarketplaceCard";
import { LeadListItem } from "./LeadListItem";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { TableView } from "./TableView";
import { ViewSwitcher, type ViewMode } from "./ViewSwitcher";

export const dynamic = "force-dynamic";

interface Params {
  welcome?: string;
  trade?: string;
  service?: string;
  zip?: string;
  view?: string;
  lead?: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // ── The contractor's exclusive-offer queue. ──
  // Per spec §6.2: only show leads currently OFFERED to this contractor.
  // No "browse all available" mode — that defeats the never-resold promise.
  // (Owner / admin gets the full firehose via the existing /admin route.)
  const { data: matchRows } = await admin
    .from("matches")
    .select("lead_id, expires_at, score")
    .eq("contractor_user_id", user.id)
    .eq("status", "offered")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true });

  const offered = (matchRows ?? []) as Array<{ lead_id: string; expires_at: string; score: number }>;
  const expiresByLead = new Map(offered.map((m) => [m.lead_id, m.expires_at]));

  let leads: MarketplaceLead[] = [];
  if (offered.length > 0) {
    let leadQuery = admin
      .from("marketplace_leads")
      .select("*")
      .in("id", offered.map((m) => m.lead_id));
    if (searchParams.service) leadQuery = leadQuery.ilike("service_type", `%${searchParams.service}%`);
    if (searchParams.zip)     leadQuery = leadQuery.eq("zip", searchParams.zip);
    const { data } = await leadQuery;
    leads = (data ?? []) as MarketplaceLead[];
    // Preserve expires-soon order from the match query.
    leads.sort((a, b) => {
      const ea = expiresByLead.get(a.id) ?? "";
      const eb = expiresByLead.get(b.id) ?? "";
      return ea.localeCompare(eb);
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("credit_cents")
    .eq("id", user.id)
    .maybeSingle();

  const tradeFilter = searchParams.trade;
  const rows = leads.filter((r) => {
    if (tradeFilter) {
      const blob = [r.service_type, r.ai_summary, r.notes].filter(Boolean).join(" \n ");
      return classifyTrade(blob) === tradeFilter;
    }
    return true;
  });

  const balanceCents = (profile as { credit_cents?: number } | null)?.credit_cents ?? 0;
  const welcome = searchParams.welcome === "1";
  const view: ViewMode = (searchParams.view === "grid" || searchParams.view === "table" || searchParams.view === "map") ? searchParams.view as ViewMode : "split";
  const selectedId = searchParams.lead;
  const selected = (rows.find((r) => r.id === selectedId) ?? rows[0] ?? null) as MarketplaceLead | null;
  const selectedExpiresAt = selected ? expiresByLead.get(selected.id) ?? null : null;

  const hotCount = rows.filter((r) => r.ai_score >= 85).length;
  const freshCount = rows.filter((r) => (Date.now() - new Date(r.created_at).getTime()) < 60 * 60 * 1000).length;

  return (
    <div className="space-y-5">
      {welcome && (
        <div className="rounded-2xl p-5"
          style={{ background: "var(--emerald-soft)", border: "1px solid color-mix(in srgb, var(--emerald) 35%, transparent)" }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--emerald) 18%, transparent)", color: "var(--emerald-bright)" }}>
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg" style={{ color: "var(--text)" }}>Welcome to Marketplace 🎉</div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                You&apos;re on a 7-day free trial. Set your trade + ZIP preferences to start receiving matching leads.
              </p>
              <Link href="/preferences"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "var(--emerald)" }}>
                <Sliders className="h-3 w-3" /> Set preferences
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ───── HEADER ROW — title + stat chips + view switcher ───────── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            color: "var(--text)",
          }}>
            Available <em style={{ fontStyle: "italic", color: "var(--emerald-bright)" }}>now</em>
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Chip label={`${rows.length} leads`} accent="var(--emerald)" />
            {hotCount > 0  && <Chip label={`${hotCount} hot`} accent="var(--hot)" pulse />}
            {freshCount > 0 && <Chip label={`${freshCount} fresh <1h`} accent="var(--emerald-bright)" />}
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <Wallet className="h-3 w-3" /> {`$${(balanceCents / 100).toFixed(0)}`}
            </span>
          </div>
        </div>

        <ViewSwitcher active={view} />
      </header>

      {/* ───── FILTERS — trade pills + search ────────────────────────── */}
      <form className="rounded-2xl p-3 flex flex-wrap items-center gap-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        action="/dashboard">
        {tradeFilter && <input type="hidden" name="trade" value={tradeFilter} />}
        {searchParams.view && <input type="hidden" name="view" value={searchParams.view} />}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: "var(--text-faint)" }} />
          <input name="service" defaultValue={searchParams.service ?? ""}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            placeholder="Filter by service (kitchen, roof, painting…)" />
        </div>
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="w-24 px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)" }}
          placeholder="ZIP" inputMode="numeric" />
        <button className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ background: "linear-gradient(135deg, var(--emerald-bright), var(--emerald-deep))" }}>
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
      </form>

      {/* Trade pill bar */}
      <div className="flex flex-wrap gap-1.5">
        <Link href={makeHref({}, searchParams)}
          className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition"
          style={{
            background: !tradeFilter ? "var(--emerald-soft)" : "var(--surface)",
            border: !tradeFilter
              ? "1px solid color-mix(in srgb, var(--emerald) 40%, transparent)"
              : "1px solid var(--border)",
            color: !tradeFilter ? "var(--emerald)" : "var(--text-muted)",
          }}>
          All trades
        </Link>
        {TRADES.map((t) => {
          const on = tradeFilter === t.slug;
          return (
            <Link key={t.slug} href={makeHref({ trade: t.slug }, searchParams)}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition"
              style={{
                background: on ? "var(--emerald-soft)" : "var(--surface)",
                border: on
                  ? "1px solid color-mix(in srgb, var(--emerald) 40%, transparent)"
                  : "1px solid var(--border)",
                color: on ? "var(--emerald)" : "var(--text-muted)",
                fontWeight: on ? 600 : 500,
              }}>
              {t.labelPlural}
            </Link>
          );
        })}
      </div>

      {/* ───── VIEW BODY ──────────────────────────────────────────────── */}
      {view === "split" && (
        <SplitView rows={rows} selected={selected} balanceCents={balanceCents} selectedExpiresAt={selectedExpiresAt} />
      )}
      {view === "grid" && (
        rows.length ? (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((l) => <MarketplaceCard key={l.id} lead={l} />)}
          </ul>
        ) : (
          <EmptyState />
        )
      )}
      {view === "table" && <TableView rows={rows} balanceCents={balanceCents} />}
      {view === "map" && (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Map view ships in Phase 2 — needs Mapbox config.
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, accent, pulse }: { label: string; accent: string; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono"
      style={{
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
        color: accent,
      }}>
      {pulse && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent }} />
          <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        </span>
      )}
      {label}
    </span>
  );
}

function SplitView({ rows, selected, balanceCents, selectedExpiresAt }: {
  rows: MarketplaceLead[]; selected: MarketplaceLead | null; balanceCents: number; selectedExpiresAt: string | null;
}) {
  return (
    <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-4 items-start">
      {/* Left list — compact rows */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            {rows.length} leads
          </span>
        </div>
        <div className="px-2 py-2 space-y-1 max-h-[640px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No leads match.
            </div>
          ) : rows.map((lead) => (
            <LeadListItem key={lead.id} lead={lead}
              selected={!!selected && selected.id === lead.id} />
          ))}
        </div>
      </div>

      {/* Right detail */}
      <LeadDetailPanel lead={selected} balanceCents={balanceCents} offerExpiresAt={selectedExpiresAt} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl p-12 text-center"
      style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-4"
        style={{ background: "linear-gradient(135deg, var(--emerald), var(--emerald-deep))" }}>
        <Store className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>No offers in your queue right now.</h3>
      <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
        Leads are routed to one contractor at a time — never broadcast. When a homeowner matches your trade + ZIP, you&apos;ll be the first (and only) pro offered. Check back, or widen your preferences.
      </p>
    </div>
  );
}

// Build href preserving non-trade params (view, service, zip).
function makeHref(overrides: { trade?: string }, sp: Params): string {
  const next = new URLSearchParams();
  if (overrides.trade) next.set("trade", overrides.trade);
  if (sp.view)    next.set("view", sp.view);
  if (sp.service) next.set("service", sp.service);
  if (sp.zip)     next.set("zip", sp.zip);
  if (sp.lead)    next.set("lead", sp.lead);
  const s = next.toString();
  return `/dashboard${s ? `?${s}` : ""}`;
}
