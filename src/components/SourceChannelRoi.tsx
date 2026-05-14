import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  SOURCE_CHANNEL_LABELS,
  type LeadSourceChannel,
} from "@/lib/lead-intake";
import type { Lead } from "@/lib/types";

type ClaimedLead = {
  user_id: string;
  source: string | null;
  status: Lead["status"];
};

const RECOGNIZED_SOURCES = new Set<LeadSourceChannel>([
  "google_ads", "meta_facebook", "meta_instagram",
  "website_form", "marketplace_form", "webhook", "manual", "scraped",
]);

function normalize(source: string | null): LeadSourceChannel | "other" {
  if (!source) return "other";
  const lower = source.toLowerCase();
  if (RECOGNIZED_SOURCES.has(lower as LeadSourceChannel)) return lower as LeadSourceChannel;
  if (lower === "marketplace") return "marketplace_form";
  return "other";
}

export async function SourceChannelRoi() {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("user_id,source,status");
  const rows = (data ?? []) as ClaimedLead[];
  if (rows.length === 0) return null;

  const buckets: Record<string, { leads: number; won: number; lost: number }> = {};
  for (const r of rows) {
    const key = normalize(r.source);
    const b = buckets[key] ?? { leads: 0, won: 0, lost: 0 };
    b.leads += 1;
    if (r.status === "won") b.won += 1;
    if (r.status === "lost") b.lost += 1;
    buckets[key] = b;
  }

  const tableRows = Object.entries(buckets)
    .map(([key, b]) => ({
      key,
      label:
        key === "other" ? "Other / Unknown" :
        (SOURCE_CHANNEL_LABELS as Record<string, string>)[key] ?? key,
      ...b,
      closeRate: b.leads > 0 ? Math.round((b.won / b.leads) * 100) : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold">Source channel ROI</h2>
        <span className="text-xs text-slate-500 ml-auto">All-time</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-slate-500 text-left">
            <th className="font-medium py-1.5">Source</th>
            <th className="font-medium py-1.5 text-right">Leads</th>
            <th className="font-medium py-1.5 text-right">Won</th>
            <th className="font-medium py-1.5 text-right hidden sm:table-cell">Lost</th>
            <th className="font-medium py-1.5 text-right">Close rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableRows.map((r) => (
            <tr key={r.key}>
              <td className="py-2 font-medium">{r.label}</td>
              <td className="py-2 text-right">{r.leads}</td>
              <td className="py-2 text-right text-emerald-700">{r.won}</td>
              <td className="py-2 text-right text-rose-700 hidden sm:table-cell">{r.lost}</td>
              <td className="py-2 text-right font-medium">{r.closeRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
