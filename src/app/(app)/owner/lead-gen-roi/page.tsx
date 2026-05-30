import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { TrendingUp, AlertCircle } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

interface ChannelRow {
  source_channel: string | null;
  ai_score: number | null;
  status: string | null;
  price_cents: number | null;
  created_at: string;
  buyer_id: string | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  google_ads:       "Google Ads",
  meta_facebook:    "Facebook Ads",
  meta_instagram:   "Instagram Ads",
  website_form:     "Website form / Quote calculator",
  marketplace_form: "Find-a-pro form",
  webhook:          "Webhook",
  manual:           "Manual",
  scraped:          "Scraped (permits / public records)",
};

const ASSUMED_COST_PER_LEAD: Record<string, number> = {
  meta_facebook:    25,
  meta_instagram:   25,
  google_ads:       45,
  scraped:          1.5,   // BatchData $0.10 lookup + Lob $0.85 postcard amortized + cron compute
  website_form:     0,
  marketplace_form: 0,
  webhook:          0,
  manual:           0,
};

export default async function LeadGenRoiPage() {
  await requireModule("cf-marketplace");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await admin
    .from("marketplace_leads")
    .select("source_channel,ai_score,status,price_cents,created_at,buyer_id")
    .gte("created_at", since30)
    .limit(10_000);

  const rows = (leads ?? []) as ChannelRow[];

  // Aggregate by channel
  const byChannel: Record<string, {
    count: number;
    qualified: number;     // ai_score >= 60
    claimed: number;       // buyer_id is set
    revenue_cents: number;
    avg_score: number;
  }> = {};
  for (const r of rows) {
    const ch = r.source_channel ?? "unknown";
    const b = byChannel[ch] ??= { count: 0, qualified: 0, claimed: 0, revenue_cents: 0, avg_score: 0 };
    b.count++;
    if ((r.ai_score ?? 0) >= 60) b.qualified++;
    if (r.buyer_id) {
      b.claimed++;
      b.revenue_cents += r.price_cents ?? 0;
    }
    b.avg_score = ((b.avg_score * (b.count - 1)) + (r.ai_score ?? 0)) / b.count;
  }

  const totalLeads = rows.length;
  const totalQualified = rows.filter((r) => (r.ai_score ?? 0) >= 60).length;
  const totalClaimed = rows.filter((r) => r.buyer_id).length;
  const totalRevenueCents = rows.reduce((s, r) => s + (r.buyer_id ? (r.price_cents ?? 0) : 0), 0);

  const channelsSorted = Object.entries(byChannel).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <span className="section-eyebrow"><TrendingUp className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Lead-gen <em>ROI</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Last 30 days · all sources · all leads (including scraped). Claimed = a buyer took the lead in the marketplace. Cost estimates are baseline assumptions per channel.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Total leads (30d)"   value={String(totalLeads)} />
        <Tile label="Qualified (≥60)"    value={String(totalQualified)} pct={totalLeads > 0 ? Math.round((totalQualified / totalLeads) * 100) : null} />
        <Tile label="Claimed by buyer"   value={String(totalClaimed)}   pct={totalLeads > 0 ? Math.round((totalClaimed / totalLeads) * 100) : null} />
        <Tile label="Marketplace revenue" value={`$${(totalRevenueCents / 100).toFixed(0)}`} />
      </section>

      <section>
        <h2 className="section-title mb-3">By channel</h2>
        {channelsSorted.length === 0 ? (
          <div className="card p-6 text-center text-white/60 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-300 mx-auto mb-2" />
            No leads in the last 30 days. Once your scrapers, Meta ads, or quote calculator start producing, this dashboard fills in automatically.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-white/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Qualified</th>
                  <th className="px-4 py-3 font-medium text-right">Claimed</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Est. CPL</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {channelsSorted.map(([ch, b]) => {
                  const cpl = ASSUMED_COST_PER_LEAD[ch] ?? 0;
                  const spent = cpl * b.count;
                  const revenue = b.revenue_cents / 100;
                  const net = revenue - spent;
                  return (
                    <tr key={ch} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-white">{CHANNEL_LABELS[ch] ?? ch}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/80">{b.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-300 hidden sm:table-cell">{b.qualified}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/80">{b.claimed}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-300">${revenue.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/50 font-mono text-xs hidden md:table-cell">${cpl.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>${net.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">How this dashboard scores ROI</h2>
        <ul className="text-sm text-white/70 space-y-1.5 list-disc pl-5">
          <li><strong>Qualified</strong> means AI score ≥ 60 (best-guess of buyer intent + completeness).</li>
          <li><strong>Claimed</strong> means another contractor bought the lead in your marketplace.</li>
          <li><strong>Revenue</strong> is your share of claimed-lead price_cents (this is YOUR top line, not the buyer&apos;s).</li>
          <li><strong>Est. CPL</strong> uses industry assumptions (Meta $25, Google $45, scraped+enriched $1.50). Override with actuals once you have ad-platform numbers.</li>
          <li><strong>Net</strong> = revenue − (cost-per-lead × leads). Negative means the channel costs more than it brings in via marketplace claims.</li>
        </ul>
        <p className="text-xs text-white/40">
          To track jobs won (not just claimed), connect your /leads pipeline conversion-to-job logic — that&apos;s separate from this marketplace-side view.
        </p>
      </section>
    </div>
  );
}

function Tile({ label, value, pct }: { label: string; value: string; pct?: number | null }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{value}</div>
      {pct !== null && pct !== undefined && (
        <div className="text-[10px] font-mono text-white/40">{pct}%</div>
      )}
    </div>
  );
}
