import { TrendingUp, AlertCircle, MousePointer, Eye, CircleDollarSign } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function LaunchpadAds() {
  await requireModule("cf-launchpad");

  // TODO: pull real metrics from connected Google Ads + Meta Ads accounts
  // via OAuth + Marketing API. For now show placeholder structure.
  const linked = { google: false, meta: false };
  const stats = {
    spend_30d:        0,
    impressions:      0,
    clicks:           0,
    leads:            0,
    cost_per_lead:    0,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <span className="section-eyebrow"><TrendingUp className="h-3.5 w-3.5" /> Launchpad</span>
        <h1 className="mt-2 display-h2">Ad <em>campaigns</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Google Ads + Meta Ads, managed by Davi&apos;s team. Performance updated daily.
        </p>
      </header>

      {(!linked.google || !linked.meta) && (
        <section className="card p-4 bg-amber-500/10 ring-1 ring-amber-400/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-amber-100 font-semibold">Connect your ad accounts</div>
              <div className="text-xs text-white/70 mt-1">
                Once Davi has access to your Google Ads + Meta Business accounts, metrics show up here.
                He&apos;ll request access via the Messages tab during kickoff.
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Tile label="Spend (30d)" value={`$${stats.spend_30d.toLocaleString()}`} icon={CircleDollarSign} />
        <Tile label="Impressions"  value={stats.impressions.toLocaleString()} icon={Eye} />
        <Tile label="Clicks"       value={stats.clicks.toLocaleString()}      icon={MousePointer} />
        <Tile label="Leads"        value={stats.leads.toString()}              icon={TrendingUp} />
        <Tile label="Cost / lead"  value={stats.leads ? `$${(stats.spend_30d / stats.leads).toFixed(0)}` : "—"} icon={CircleDollarSign} />
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-3">Google Ads</h2>
        <div className="text-sm text-white/60">
          {linked.google ? "Connected." : "Not connected yet."}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-3">Meta Ads</h2>
        <div className="text-sm text-white/60">
          {linked.meta ? "Connected." : "Not connected yet."}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-orange-500/15 ring-1 ring-orange-400/30 flex items-center justify-center text-orange-300 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
        <div className="text-xl font-semibold text-white tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}
