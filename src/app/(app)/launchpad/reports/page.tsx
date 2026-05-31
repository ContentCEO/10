import { Calendar, FileText } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

// TODO: when Davi publishes monthly PDFs (likely via Supabase Storage),
// list them here with month label + download link. For now placeholder.
interface MonthlyReport {
  month: string;
  url: string;
  spend_cents: number;
  leads: number;
  notes: string;
}

const REPORTS: MonthlyReport[] = [];

export default async function LaunchpadReports() {
  await requireModule("cf-launchpad");

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Calendar className="h-3.5 w-3.5" /> Launchpad</span>
        <h1 className="mt-2 display-h2">Monthly <em>reports</em></h1>
        <p className="mt-2 text-sm text-white/60">
          End-of-month performance reviews from Davi. Includes ad spend, leads delivered, recommendations.
        </p>
      </header>

      {REPORTS.length === 0 ? (
        <section className="card p-10 text-center">
          <FileText className="h-8 w-8 text-white/30 mx-auto mb-3" />
          <div className="text-sm text-white/70">
            No reports yet. Your first one drops at the end of month 1.
          </div>
        </section>
      ) : (
        <ul className="space-y-3">
          {REPORTS.map((r) => (
            <li key={r.month} className="card p-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-white">{r.month}</div>
                  <div className="text-xs text-white/60 mt-0.5">{r.notes}</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Spend</div>
                    <div className="text-white tabular-nums">${(r.spend_cents / 100).toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Leads</div>
                    <div className="text-white tabular-nums">{r.leads}</div>
                  </div>
                  <a href={r.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 ring-1 ring-orange-400/40 text-orange-100 hover:bg-orange-500/30 px-3 py-1.5 text-xs font-semibold">
                    Download
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
