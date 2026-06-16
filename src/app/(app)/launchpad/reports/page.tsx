import { Calendar, FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

interface MonthlyReport {
  id: string;
  month: string;
  pdf_url: string | null;
  spend_cents: number;
  leads: number;
  notes: string | null;
  created_at: string;
}

function formatMonth(m: string): string {
  // "2026-06" → "June 2026"
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  const d = new Date(y, mo - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function LaunchpadReports() {
  await requireModule("cf-launchpad");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // Find this user's launchpad_clients row, then pull reports for it.
  const { data: clientRow } = await admin
    .from("launchpad_clients")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  let reports: MonthlyReport[] = [];
  if (clientRow?.id) {
    const { data } = await admin
      .from("launchpad_reports")
      .select("id,month,pdf_url,spend_cents,leads,notes,created_at")
      .eq("client_id", clientRow.id)
      .order("month", { ascending: false })
      .limit(24);
    reports = (data ?? []) as MonthlyReport[];
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Calendar className="h-3.5 w-3.5" /> Launchpad</span>
        <h1 className="mt-2 display-h2">Monthly <em>reports</em></h1>
        <p className="mt-2 text-sm text-white/60">
          End-of-month performance reviews from Davi. Includes ad spend, leads delivered, recommendations.
        </p>
      </header>

      {reports.length === 0 ? (
        <section className="card p-10 text-center">
          <FileText className="h-8 w-8 text-white/30 mx-auto mb-3" />
          <div className="text-sm text-white/70">
            No reports yet. Your first one drops at the end of month 1.
          </div>
        </section>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-white">{formatMonth(r.month)}</div>
                  {r.notes && <div className="text-xs text-white/60 mt-0.5 line-clamp-2">{r.notes}</div>}
                </div>
                <div className="flex items-center gap-5 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Spend</div>
                    <div className="text-white tabular-nums">${(r.spend_cents / 100).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Leads</div>
                    <div className="text-white tabular-nums">{r.leads}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">CPL</div>
                    <div className="text-white tabular-nums">
                      {r.leads ? `$${(r.spend_cents / r.leads / 100).toFixed(0)}` : "—"}
                    </div>
                  </div>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 ring-1 ring-orange-400/40 text-orange-100 hover:bg-orange-500/30 px-3 py-1.5 text-xs font-semibold">
                      <Download className="h-3 w-3" /> PDF
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
