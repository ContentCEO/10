import Link from "next/link";
import { Activity, AlertCircle, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ScraperRun {
  id: string;
  source: string;
  region: string | null;
  fetched: number;
  inserted: number;
  duplicates: number;
  error: string | null;
  ran_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  reddit:              "Reddit (multi-sub)",
  noaa_storms:         "NOAA Storm Events",
  boston_permits:      "Boston permits",
  cambridge_permits:   "Cambridge permits",
  somerville_permits:  "Somerville permits",
  nyc_permits:         "NYC permits",
  chicago_permits:     "Chicago permits",
  deeds:               "MA Registry of Deeds",
};

const KNOWN_SOURCES = Object.keys(SOURCE_LABELS);

export default async function OpportunitiesPage() {
  const supabase = createClient();

  // Last 30 days of scraper activity.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: runs } = await supabase
    .from("scraper_runs").select("*")
    .gte("ran_at", since)
    .order("ran_at", { ascending: false })
    .limit(200);
  const runList = (runs ?? []) as ScraperRun[];

  // Aggregate per source.
  const stats: Record<string, { runs: number; fetched: number; inserted: number; duplicates: number; lastRun: string | null; lastError: string | null }> = {};
  for (const r of runList) {
    const s = stats[r.source] ?? { runs: 0, fetched: 0, inserted: 0, duplicates: 0, lastRun: null, lastError: null };
    s.runs++;
    s.fetched += r.fetched;
    s.inserted += r.inserted;
    s.duplicates += r.duplicates;
    if (!s.lastRun || r.ran_at > s.lastRun) {
      s.lastRun = r.ran_at;
      s.lastError = r.error;
    }
    stats[r.source] = s;
  }

  // Marketplace activity from each source channel in the same window.
  const { data: leads } = await supabase
    .from("marketplace_leads").select("source_channel,status,created_at")
    .gte("created_at", since);

  type LeadRow = { source_channel: string; status: string };
  const sourceCounts: Record<string, { total: number; available: number; sold: number }> = {};
  for (const l of (leads ?? []) as LeadRow[]) {
    const s = sourceCounts[l.source_channel] ?? { total: 0, available: 0, sold: 0 };
    s.total++;
    if (l.status === "available") s.available++;
    if (l.status === "sold") s.sold++;
    sourceCounts[l.source_channel] = s;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" /> Lead opportunities
        </h1>
        <p className="text-sm text-slate-500">
          Every lead pipeline you've got plugged in. Run health, inventory volume, and last-pull status.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <Tile label="Active sources" value={String(Object.keys(stats).length)} tone="from-indigo-500 to-violet-500" />
        <Tile label="Leads created (30d)"
              value={String(Object.values(sourceCounts).reduce((s, c) => s + c.total, 0))}
              tone="from-amber-500 to-orange-500" />
        <Tile label="Available right now"
              value={String(Object.values(sourceCounts).reduce((s, c) => s + c.available, 0))}
              tone="from-emerald-500 to-teal-500" />
      </section>

      <section>
        <h2 className="font-semibold mb-3">Pipelines</h2>
        <ul className="grid md:grid-cols-2 gap-4">
          {KNOWN_SOURCES.map((s) => {
            const stat = stats[s];
            const inventory = sourceCounts[s === "deeds" || s.endsWith("_permits") || s === "noaa_storms" || s === "reddit" ? "scraped" : s] ?? null;
            const healthy = stat && !stat.lastError;
            return (
              <li key={s} className="card p-5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold">{SOURCE_LABELS[s]}</h3>
                  <span className={`badge ml-auto ${healthy ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : stat ? "bg-rose-100 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    {healthy
                      ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Healthy</>
                      : stat
                        ? <><AlertCircle className="h-3 w-3 mr-1" /> Errored</>
                        : "Not yet running"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Runs (30d)</dt>
                    <dd className="font-medium">{stat?.runs ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Inserted</dt>
                    <dd className="font-medium">{stat?.inserted ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Last run</dt>
                    <dd className="font-medium">{stat?.lastRun ? formatDate(stat.lastRun) : "—"}</dd>
                  </div>
                </dl>
                {stat?.lastError && (
                  <p className="mt-2 text-xs text-rose-700">{stat.lastError}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" /> Trigger pipelines manually
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          The daily cron handles these at 08:00 UTC. To run on demand (admin only),
          hit each endpoint with your <code>CRON_SECRET</code> as
          <code> Authorization: Bearer …</code>.
        </p>
        <ul className="mt-3 text-sm space-y-1 list-disc list-inside text-slate-700">
          <li><code>POST /api/scrape/reddit</code> — Reddit lead opportunities</li>
          <li><code>POST /api/scrape/permits</code> — All cities (Boston, Cambridge, Somerville, NYC, Chicago)</li>
          <li><code>POST /api/scrape/permits?source=boston_permits</code> — single city</li>
          <li><code>POST /api/scrape/storms?states=MA,NY,RI</code> — NWS active alerts</li>
          <li><code>POST /api/scrape/deeds</code> with <code>{`{ rows: [...] }`}</code> — MA Registry of Deeds (paste from your data vendor)</li>
        </ul>
        <Link href="/integrations" className="btn-secondary mt-3 inline-flex">
          See all integrations →
        </Link>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Recent runs</h2>
        {runList.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No scraper runs yet — they'll appear here after the next daily cron.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {runList.slice(0, 30).map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">{SOURCE_LABELS[r.source] ?? r.source}</span>
                  <span className="text-slate-500"> · {r.region ?? "—"}</span>
                </div>
                <div className="text-xs text-slate-500">
                  +{r.inserted} inserted · {r.duplicates} dup · {formatDate(r.ran_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 text-xs uppercase tracking-wider text-white/85">{label}</div>
      <div className="relative z-10 mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
