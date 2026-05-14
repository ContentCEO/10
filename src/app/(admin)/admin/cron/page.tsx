import Link from "next/link";
import { Clock, Zap } from "lucide-react";

// Plan 1 / B-8 — Cron schedule visualizer.
// Static representation of vercel.json crons; for runtime state see /owner.

export const dynamic = "force-static";

interface CronEntry {
  path: string;
  schedule: string;
  category: "scraper" | "agent" | "task";
  description: string;
}

const CRONS: CronEntry[] = [
  { path: "/api/cron/daily",                  schedule: "0 * * * *",        category: "task",    description: "Daily housekeeping tasks" },
  { path: "/api/cron/review-requests",        schedule: "*/10 * * * *",     category: "task",    description: "Send queued review requests" },
  { path: "/api/scrape/reddit",               schedule: "*/10 * * * *",     category: "scraper", description: "Reddit RSS · 100+ subs" },
  { path: "/api/scrape/craigslist",           schedule: "2-59/10 * * * *",  category: "scraper", description: "Craigslist RSS · 100+ regions" },
  { path: "/api/scrape/permits",              schedule: "4-59/10 * * * *",  category: "scraper", description: "Major city permits (Boston, NYC, Chicago...)" },
  { path: "/api/scrape/storms",               schedule: "6-59/10 * * * *",  category: "scraper", description: "NOAA active alerts" },
  { path: "/api/scrape/rss",                  schedule: "8-59/10 * * * *",  category: "scraper", description: "Universal RSS aggregator" },
  { path: "/api/scrape/ma-municipal",         schedule: "0 */2 * * *",      category: "scraper", description: "MA municipal permits · 100+ cities" },
  { path: "/api/scrape/sam-gov",              schedule: "0 */2 * * *",      category: "scraper", description: "Federal procurement (SAM.gov)" },
  { path: "/api/scrape/boston-inspections",   schedule: "20 */2 * * *",     category: "scraper", description: "Boston ISD code violations" },
  { path: "/api/scrape/boston-311",           schedule: "40 */2 * * *",     category: "scraper", description: "Boston 311 service requests" },
  { path: "/api/scrape/cambridge-inspections", schedule: "25 */2 * * *",    category: "scraper", description: "Cambridge ISD code violations" },
  { path: "/api/scrape/storm-prep",           schedule: "50 */2 * * *",     category: "scraper", description: "Pre-storm WATCH alerts (12-48h)" },
  { path: "/api/scrape/state-rfps",           schedule: "0 */4 * * *",      category: "scraper", description: "State-level RFP feeds" },
  { path: "/api/scrape/yelp",                 schedule: "30 */4 * * *",     category: "scraper", description: "Yelp business updates" },
  { path: "/api/scrape/mass-gov-bids",        schedule: "0 */6 * * *",      category: "scraper", description: "MA government bids" },
  { path: "/api/scrape/massdot-projects",     schedule: "15 */6 * * *",     category: "scraper", description: "MassDOT subcontract opportunities" },
  { path: "/api/scrape/ma-school-construction", schedule: "35 */6 * * *",   category: "scraper", description: "MSBA + DCAMM school RFPs" },
  { path: "/api/scrape/ma-foreclosures",      schedule: "45 */6 * * *",     category: "scraper", description: "MA distressed properties" },
  { path: "/api/scrape/serpapi",              schedule: "0 */12 * * *",     category: "scraper", description: "SerpAPI Google intent (40 MA cities)" },
  { path: "/api/agents/tick",                 schedule: "*/5 * * * *",      category: "agent",   description: "10 AI agents · lead triage / followup drafter / curation / etc." },
];

function describeSchedule(s: string): string {
  if (s.startsWith("*/")) return `Every ${s.slice(2).split(" ")[0]} min`;
  if (/^\d+-\d+\/\d+ \* \* \* \*$/.test(s)) {
    const match = s.match(/^\d+-\d+\/(\d+) \* \* \* \*$/);
    return `Every ${match?.[1] ?? "?"} min (offset)`;
  }
  if (/^\d+ \*\/\d+ \* \* \*$/.test(s)) {
    const match = s.match(/^\d+ \*\/(\d+) \* \* \*$/);
    return `Every ${match?.[1] ?? "?"} hours`;
  }
  if (s === "0 * * * *") return "Every hour";
  if (s === "0 6 * * *") return "Daily @ 6 AM UTC";
  return s;
}

export default function CronVisualizerPage() {
  const byCategory = {
    scraper: CRONS.filter((c) => c.category === "scraper"),
    agent:   CRONS.filter((c) => c.category === "agent"),
    task:    CRONS.filter((c) => c.category === "task"),
  };

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-slate-500">← Overview</Link>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" /> Cron schedule
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Every scheduled job that runs on Vercel cron. <strong>{CRONS.length}</strong> total — {byCategory.scraper.length} scrapers, {byCategory.agent.length} agent runners, {byCategory.task.length} housekeeping tasks.
        </p>
      </header>

      {Object.entries(byCategory).map(([cat, list]) => (
        <section key={cat} className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 mb-3">{cat}s · {list.length}</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 font-medium">Path</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Schedule</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">Cron expr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c) => (
                <tr key={c.path}>
                  <td className="py-2 pr-3"><code className="text-xs">{c.path}</code></td>
                  <td className="py-2 pr-3 text-slate-700">{c.description}</td>
                  <td className="py-2 pr-3 text-right text-xs text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      {describeSchedule(c.schedule)}
                    </span>
                  </td>
                  <td className="py-2 text-right text-[10px] font-mono text-slate-400">{c.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
