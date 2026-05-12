import { ClipboardCheck, Filter, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { type MarketplaceLead } from "@/lib/marketplace";
import { CurationRow } from "./CurationRow";
import { AutoApproveControl } from "./AutoApproveControl";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  reddit:              "Reddit",
  craigslist:          "Craigslist",
  noaa_storms:         "NOAA storms",
  boston_permits:      "Boston permits",
  cambridge_permits:   "Cambridge permits",
  somerville_permits:  "Somerville permits",
  lowell_permits:      "Lowell permits",
  nyc_permits:         "NYC permits",
  chicago_permits:     "Chicago permits",
  la_permits:          "LA permits",
  sf_permits:          "SF permits",
  seattle_permits:     "Seattle permits",
  austin_permits:      "Austin permits",
  dallas_permits:      "Dallas permits",
  dc_permits:          "DC permits",
  detroit_permits:     "Detroit permits",
  mass_gov_bids:       "Mass.gov bids",
  sam_gov:             "SAM.gov federal",
  rss_universal:       "Custom RSS",
};

export default async function CurationPage({
  searchParams,
}: {
  searchParams: { source?: string; min_score?: string; state?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("auto_approve_score_threshold").eq("id", user.id).single();
  const autoApproveThreshold = (profile as { auto_approve_score_threshold?: number } | null)?.auto_approve_score_threshold ?? 0;

  let q = supabase
    .from("marketplace_leads")
    .select("*")
    .eq("requires_curation", true)
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.min_score) q = q.gte("ai_score", Number(searchParams.min_score));

  const { data: pending } = await q;
  let rows = (pending ?? []) as (MarketplaceLead & { source_channel?: string; raw_payload?: Record<string, unknown> })[];

  if (searchParams.state) {
    const state = searchParams.state.toUpperCase();
    rows = rows.filter((r) => {
      const city = (r.city ?? "").toUpperCase();
      return city.includes(state);
    });
  }

  // Aggregate counts by source (from raw_payload or source_channel)
  const sourceCounts: Record<string, number> = {};
  for (const r of rows) {
    const payload = r.raw_payload as { source?: string; site?: string } | undefined;
    const key = String(payload?.site ?? payload?.source ?? r.source_channel ?? "unknown");
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1;
  }
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const hotCount = rows.filter((r) => r.ai_score >= 75).length;

  return (
    <div className="space-y-6">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><ClipboardCheck className="h-3.5 w-3.5" /> Owner only</span>
          <h1 className="mt-2 display-h2">Lead curation</h1>
          <p className="mt-2 lede max-w-2xl">
            Every scraped lead lands here first. Approve to send to the
            marketplace, reject to drop. Set an auto-approve threshold to
            skip review on high-score leads.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
              {rows.length} pending
            </span>
            {hotCount > 0 && (
              <span className="badge bg-rose-100 text-rose-700 ring-rose-200">
                🔥 {hotCount} score 75+
              </span>
            )}
          </div>
        </div>
      </header>

      <AutoApproveControl initialThreshold={autoApproveThreshold} />

      {/* Source breakdown */}
      <section className="card p-5">
        <h2 className="section-title flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" /> By source
        </h2>
        <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          {topSources.map(([src, n]) => (
            <li key={src} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
              <span className="text-ink-700 truncate">{SOURCE_LABELS[src] ?? src}</span>
              <span className="font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Filters */}
      <form className="card p-4 grid sm:grid-cols-[1fr_140px_140px_auto] gap-2" action="/admin/curation">
        <input name="state" defaultValue={searchParams.state ?? ""} className="input" placeholder="Filter by state/city (e.g. MA, Boston)" />
        <input name="min_score" defaultValue={searchParams.min_score ?? ""} className="input" placeholder="Min AI score" inputMode="numeric" />
        <input name="source" defaultValue={searchParams.source ?? ""} className="input" placeholder="Source" />
        <button className="btn-primary"><Filter className="h-4 w-4" /> Filter</button>
      </form>

      {/* Pending list */}
      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-glow mb-4">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-ink-600 max-w-sm mx-auto">
            All caught up. No pending leads — scrapers are quiet or you&apos;ve
            already reviewed everything. Check again in a few minutes.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((lead) => (
            <CurationRow key={lead.id} lead={lead} sourceLabel={SOURCE_LABELS[String((lead.raw_payload as { source?: string })?.source ?? "")]} />
          ))}
        </ul>
      )}
    </div>
  );
}

