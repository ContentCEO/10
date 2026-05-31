import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket, Users, ArrowRight, Plus, Activity, CircleDollarSign, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

interface ClientRow {
  id: string;
  business_name: string;
  city: string | null;
  tier: string | null;
  stage: string;
  monthly_budget_cents: number;
  started_at: string;
  went_live_at: string | null;
}

const STAGE_TONE: Record<string, string> = {
  intake:   "text-white/60 bg-white/[0.06] ring-white/10",
  design:   "text-indigo-200 bg-indigo-500/15 ring-indigo-400/30",
  build:    "text-orange-200 bg-orange-500/15 ring-orange-400/30",
  review:   "text-amber-200 bg-amber-500/15 ring-amber-400/30",
  live:     "text-emerald-200 bg-emerald-500/15 ring-emerald-400/30",
  paused:   "text-white/40 bg-white/[0.04] ring-white/10",
  churned:  "text-rose-300 bg-rose-500/10 ring-rose-400/20",
};

export default async function OwnerLaunchpadDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("launchpad_clients")
    .select("id,business_name,city,tier,stage,monthly_budget_cents,started_at,went_live_at")
    .order("started_at", { ascending: false })
    .limit(200);

  const rows = (clients ?? []) as ClientRow[];
  const active = rows.filter((r) => !["paused", "churned"].includes(r.stage));
  const mrr = rows
    .filter((r) => ["foundation_growth", "revenue_share"].includes(r.tier ?? "") && !["paused", "churned"].includes(r.stage))
    .reduce((sum, r) => sum + (r.tier === "foundation_growth" ? 99700 : r.tier === "revenue_share" ? 49700 : 0), 0);
  const liveCount = rows.filter((r) => r.stage === "live").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <span className="section-eyebrow"><Rocket className="h-3.5 w-3.5" /> Owner · Launchpad</span>
          <h1 className="mt-2 display-h2">Agency <em>clients</em></h1>
          <p className="mt-2 text-sm text-white/60">
            Every contractor who&apos;s bought a Launchpad tier. Track build stage, ad spend, monthly retainer.
          </p>
        </div>
        <Link href="/owner/launchpad/intake"
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm hover:bg-orange-400 transition shrink-0">
          <Plus className="h-4 w-4" /> New client
        </Link>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Active clients" value={String(active.length)} icon={Users} />
        <Tile label="Live sites"     value={String(liveCount)}     icon={Activity} />
        <Tile label="Recurring MRR"  value={`$${(mrr / 100).toLocaleString()}`} icon={CircleDollarSign} />
        <Tile label="Total signed"   value={String(rows.length)}   icon={Rocket} />
      </section>

      <section>
        <h2 className="section-title mb-3">Pipeline</h2>
        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="h-8 w-8 text-white/30 mx-auto mb-3" />
            <div className="text-sm text-white/70 mb-4">No Launchpad clients yet.</div>
            <Link href="/owner/launchpad/intake" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 text-white font-semibold px-4 py-2 text-xs hover:bg-orange-400 transition">
              <Plus className="h-3.5 w-3.5" /> Onboard your first
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-white/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Tier</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Budget</th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Started</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="text-white">{c.business_name}</div>
                      <div className="text-xs text-white/40">{c.city ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70 hidden sm:table-cell">{c.tier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full ring-1 ring-inset px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STAGE_TONE[c.stage] ?? STAGE_TONE.intake}`}>
                        {c.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70 hidden md:table-cell">
                      ${(c.monthly_budget_cents / 100).toLocaleString()}/mo
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-white/40 font-mono hidden md:table-cell">
                      {new Date(c.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/owner/launchpad/clients/${c.id}`} className="text-orange-300 hover:text-orange-200 inline-flex items-center gap-1 text-xs font-semibold">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5 space-y-2">
        <div className="flex items-start gap-3 text-sm text-white/70">
          <Clock className="h-4 w-4 mt-0.5 text-white/40 shrink-0" />
          <p>
            Pre-launch tip: build a few <Link href="/preview/example-roofing-marblehead" className="text-orange-300 hover:underline">mockup pages</Link> and DM them to contractors. Pattern is <code className="text-white/80">/preview/[business-name]-[city]</code>.
          </p>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Rocket }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-orange-500/15 ring-1 ring-orange-400/30 flex items-center justify-center text-orange-300 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
        <div className="text-2xl font-semibold text-white tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}
