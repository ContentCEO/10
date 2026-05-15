import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { isQualifiedLead } from "@/lib/lead-quality";
import { ScraperRunNowButton } from "./RunNow";
import { RunAllControls } from "./RunAllControls";

export const dynamic = "force-dynamic";

interface SampleLead {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  zip: string | null;
  notes: string | null;
  service_type: string | null;
  ai_summary: string | null;
}

interface RunRow {
  source: string;
  region: string | null;
  fetched: number;
  inserted: number;
  duplicates: number;
  created_at: string;
}

interface SourceStat {
  source: string;
  lastRun: string | null;
  lastFetched: number;
  lastInserted: number;
  lastDuplicates: number;
  totalInserted24h: number;
  ageMinutes: number | null;
}

const KNOWN_SOURCES: { key: string; route: string; label: string }[] = [
  { key: "permits",                route: "permits",                label: "Permits (29 cities)" },
  { key: "reddit",                 route: "reddit",                 label: "Reddit" },
  { key: "craigslist",             route: "craigslist",             label: "Craigslist" },
  { key: "storms",                 route: "storms",                 label: "Storms" },
  { key: "rss",                    route: "rss",                    label: "RSS feeds" },
  { key: "nextdoor",               route: "nextdoor",               label: "Nextdoor" },
  { key: "facebook-groups",        route: "facebook-groups",        label: "Facebook groups" },
  { key: "deeds",                  route: "deeds",                  label: "Deeds" },
  { key: "boston-inspections",     route: "boston-inspections",     label: "Boston inspections" },
  { key: "cambridge-inspections",  route: "cambridge-inspections",  label: "Cambridge inspections" },
  { key: "boston-311",             route: "boston-311",             label: "Boston 311" },
  { key: "ma-municipal",           route: "ma-municipal",           label: "MA municipal" },
  { key: "storm-prep",             route: "storm-prep",             label: "Storm prep" },
  { key: "ma-evictions",           route: "ma-evictions",           label: "MA evictions" },
  { key: "ma-licenses",            route: "ma-licenses",            label: "MA licenses" },
  { key: "sam-gov",                route: "sam-gov",                label: "SAM.gov" },
  { key: "ma-foreclosures",        route: "ma-foreclosures",        label: "MA foreclosures" },
  { key: "yelp",                   route: "yelp",                   label: "Yelp" },
  { key: "state-rfps",             route: "state-rfps",             label: "State RFPs" },
  { key: "mass-gov-bids",          route: "mass-gov-bids",          label: "Mass.gov bids" },
  { key: "massdot-projects",       route: "massdot-projects",       label: "MassDOT projects" },
  { key: "ma-school-construction", route: "ma-school-construction", label: "MA school construction" },
  { key: "serpapi",                route: "serpapi",                label: "SerpAPI" },
];

function ago(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export default async function ScrapersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: runs }, { count: marketplaceCount }, { count: leadsToday }, { count: pendingCount }, { data: sampleRows }] = await Promise.all([
    admin.from("scraper_runs")
      .select("source,region,fetched,inserted,duplicates,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    admin.from("marketplace_leads")
      .select("id", { count: "exact", head: true })
      .eq("source_channel", "scraped")
      .gte("created_at", since),
    admin.from("leads")
      .select("id", { count: "exact", head: true })
      .ilike("source", "scrape:%")
      .gte("created_at", since),
    admin.from("marketplace_leads")
      .select("id", { count: "exact", head: true })
      .eq("requires_curation", true),
    admin.from("marketplace_leads")
      .select("id,name,phone,city,zip,notes,service_type,ai_summary")
      .eq("source_channel", "scraped")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Quality-gate breakdown: run each sample row through isQualifiedLead
  // and tally which check rejected it. This is the diagnostic for
  // "marketplace shows 0 but I have 2200 scraped rows".
  const sample = (sampleRows ?? []) as SampleLead[];
  let passes = 0;
  const fails = { name: 0, phone: 0, ma: 0, intent: 0 };
  const examples: { reason: string; row: SampleLead }[] = [];
  for (const r of sample) {
    const q = isQualifiedLead({
      name: r.name, phone: r.phone, city: r.city, zip: r.zip,
      notes: r.notes, service_type: r.service_type, ai_summary: r.ai_summary,
    });
    if (q.ok) { passes++; continue; }
    if (!q.hasRealName)         fails.name++;
    if (!q.hasPhone)            fails.phone++;
    if (!q.isMA)                fails.ma++;
    if (!q.hasContractorIntent) fails.intent++;
    // Stash one example per reason for the table
    for (const reason of q.reasons) {
      if (!examples.find((e) => e.reason === reason)) {
        examples.push({ reason, row: r });
      }
    }
  }
  const hasBatchData = Boolean(process.env.BATCHDATA_API_KEY);

  const stats: Record<string, SourceStat> = {};
  for (const src of KNOWN_SOURCES) {
    stats[src.key] = {
      source: src.key,
      lastRun: null,
      lastFetched: 0, lastInserted: 0, lastDuplicates: 0,
      totalInserted24h: 0,
      ageMinutes: null,
    };
  }
  for (const r of (runs ?? []) as RunRow[]) {
    // Some scrapers log the city/region as the source; collapse to root.
    const root = KNOWN_SOURCES.find((s) => r.source === s.key || r.source.startsWith(`${s.key}_`) || r.source.startsWith(`${s.key}:`))?.key
              ?? r.source;
    const cur = stats[root] ?? (stats[root] = {
      source: root, lastRun: null, lastFetched: 0, lastInserted: 0, lastDuplicates: 0, totalInserted24h: 0, ageMinutes: null,
    });
    cur.totalInserted24h += r.inserted ?? 0;
    if (!cur.lastRun || r.created_at > cur.lastRun) {
      cur.lastRun = r.created_at;
      cur.lastFetched = r.fetched ?? 0;
      cur.lastInserted = r.inserted ?? 0;
      cur.lastDuplicates = r.duplicates ?? 0;
      cur.ageMinutes = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60_000);
    }
  }

  const grandInserted = Object.values(stats).reduce((s, x) => s + x.totalInserted24h, 0);
  const dead = Object.values(stats).filter((s) => !s.lastRun || (s.ageMinutes ?? 9999) > 180);

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <span className="section-eyebrow"><Activity className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Scraper <em>health</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Live status of every public-records ingest. Marketplace gets the raw row, then the mirror cron pushes a copy into your <code className="text-white/80">/leads</code> pipeline.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Tile label="Sources" value={String(KNOWN_SOURCES.length)} icon={Activity} />
        <Tile label="Scraped rows (24h)" value={String(marketplaceCount ?? 0)} icon={CheckCircle2} />
        <Tile label="Mirrored to /leads (24h)" value={String(leadsToday ?? 0)} icon={CheckCircle2} />
        <Tile
          label="Stale sources (>3h)"
          value={String(dead.length)}
          icon={AlertCircle}
          tone={dead.length > 0 ? "warn" : "ok"}
        />
        <a href="/admin/curation" className="card p-4 flex items-start gap-3 hover:ring-brand-400/40 transition">
          <div className={(pendingCount ?? 0) > 0
            ? "h-9 w-9 rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center text-amber-300"
            : "h-9 w-9 rounded-lg bg-brand-500/15 ring-1 ring-brand-400/30 flex items-center justify-center text-brand-200"}>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Pending import</div>
            <div className="text-2xl font-semibold text-white tabular-nums mt-0.5">{pendingCount ?? 0}</div>
            <div className="text-[10px] text-white/40 mt-0.5">Review &amp; bulk-import →</div>
          </div>
        </a>
      </section>

      <RunAllControls sources={KNOWN_SOURCES.map((s) => s.route)} />

      {sample.length > 0 && (
        <section className="card p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="section-title flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-300" /> Why no leads in marketplace?
            </h2>
            <span className="text-xs text-white/50 font-mono">{sample.length} scraped rows analyzed</span>
          </div>
          <p className="text-sm text-white/60">
            Each row is checked against the 4 filter rules. Bars show how many of the {sample.length} sample rows failed each check (a row can fail multiple).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FailTile label="Pass" value={passes} total={sample.length} good />
            <FailTile label="Missing name"   value={fails.name}   total={sample.length} />
            <FailTile label="Missing phone"  value={fails.phone}  total={sample.length} />
            <FailTile label="Not in MA"      value={fails.ma}     total={sample.length} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FailTile label="No contractor intent" value={fails.intent} total={sample.length} wide />
          </div>

          {fails.phone > passes && (
            <div className={hasBatchData ? "rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/30 p-3 text-xs text-emerald-200" : "rounded-lg bg-amber-500/10 ring-1 ring-amber-400/30 p-3 text-xs text-amber-200"}>
              {hasBatchData ? (
                <>BatchData key is configured. If permit leads still lack phones, the API may not have a match for the address — try running permits and watch the scraper_runs error column.</>
              ) : (
                <>
                  <strong>BATCHDATA_API_KEY is not set on Vercel.</strong> Permit rows arrive with phone=null and fail the phone check. Set the env var, redeploy, and run scrapers again to populate phones via reverse-lookup.
                </>
              )}
            </div>
          )}

          {examples.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-white/70 hover:text-white">Sample failures ({examples.length})</summary>
              <ul className="mt-2 space-y-2">
                {examples.slice(0, 8).map(({ reason, row }) => (
                  <li key={`${reason}-${row.id}`} className="rounded-lg bg-white/[0.03] ring-1 ring-white/10 p-2 font-mono">
                    <div className="text-rose-300">[{reason}]</div>
                    <div className="text-white/80 truncate">name: {row.name ?? "<null>"}</div>
                    <div className="text-white/60 truncate">phone: {row.phone ?? "<null>"} · city: {row.city ?? "<null>"} · zip: {row.zip ?? "<null>"}</div>
                    <div className="text-white/40 truncate">type: {row.service_type ?? "<null>"}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {grandInserted === 0 && (
        <div className="card p-4 ring-1 ring-amber-400/30 bg-amber-500/10">
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
            <div className="text-amber-100">
              <strong>Zero inserts in the last 24h.</strong> Either the cron isn't firing, the public-records APIs returned 0 new rows, or every row was a duplicate. Tap "Run now" on a permits source below to verify the pipeline end-to-end.
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="section-title mb-3">Sources</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Last run</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Fetched</th>
                <th className="px-4 py-3 font-medium text-right">Inserted</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Dupes</th>
                <th className="px-4 py-3 font-medium text-right hidden md:table-cell">24h</th>
                <th className="px-4 py-3 font-medium text-right">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {KNOWN_SOURCES.map((src) => {
                const s = stats[src.key];
                const stale = !s.lastRun || (s.ageMinutes ?? 9999) > 180;
                return (
                  <tr key={src.key} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white">{src.label}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${stale ? "text-amber-300" : "text-white/70"}`}>
                      {ago(s.lastRun)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70 hidden sm:table-cell">{s.lastFetched || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={s.lastInserted > 0 ? "text-emerald-300 font-semibold" : "text-white/40"}>
                        {s.lastInserted || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/40 hidden md:table-cell">{s.lastDuplicates || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/80 hidden md:table-cell">{s.totalInserted24h || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <ScraperRunNowButton source={src.route} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-white/40 font-mono">
        Cron schedule is defined in <code>vercel.json</code>. The mirror cron runs every 2 minutes to push fresh marketplace_leads into your /leads pipeline.
      </p>
    </div>
  );
}

function Tile({ label, value, icon: Icon, tone = "ok" }: { label: string; value: string; icon: typeof Activity; tone?: "ok" | "warn" }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={tone === "warn" ? "h-9 w-9 rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center text-amber-300"
                                       : "h-9 w-9 rounded-lg bg-brand-500/15 ring-1 ring-brand-400/30 flex items-center justify-center text-brand-200"}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
        <div className="text-2xl font-semibold text-white tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function FailTile({ label, value, total, good, wide }: { label: string; value: number; total: number; good?: boolean; wide?: boolean }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const bar = good ? "bg-emerald-400" : pct > 60 ? "bg-rose-400" : pct > 30 ? "bg-amber-400" : "bg-white/30";
  return (
    <div className={`rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
        <div className="text-xs font-mono text-white/60">{pct}%</div>
      </div>
      <div className="text-xl font-semibold text-white tabular-nums mt-0.5">{value}<span className="text-xs text-white/40 ml-1 font-normal">/ {total}</span></div>
      <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
