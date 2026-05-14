import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Cust { id: string; name: string; phone: string | null; email: string | null; }
interface JobLite { customer_id: string | null; price: number | null; status: string; updated_at: string; }

interface VipRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  jobs: number;
  revenue: number;
  last_job_at: string | null;
  tier: "platinum" | "gold" | "silver";
}

function tierFor(jobs: number, revenue: number): "platinum" | "gold" | "silver" | null {
  if (jobs >= 10 || revenue >= 50_000) return "platinum";
  if (jobs >= 5  || revenue >= 20_000) return "gold";
  if (jobs >= 3  || revenue >= 5_000)  return "silver";
  return null;
}

const TIER_TONE = {
  platinum: { bg: "bg-violet-100 text-violet-800 ring-violet-200", note: "10+ jobs OR $50k+" },
  gold:     { bg: "bg-amber-100 text-amber-800 ring-amber-200",   note: "5+ jobs OR $20k+" },
  silver:   { bg: "bg-ink-200 text-ink-700 ring-ink-300",         note: "3+ jobs OR $5k+" },
};

export default async function VipCustomersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: customers }, { data: jobs }] = await Promise.all([
    supabase.from("customers").select("id,name,phone,email").eq("user_id", user.id),
    supabase.from("jobs").select("customer_id,price,status,updated_at")
      .eq("user_id", user.id).eq("status", "completed"),
  ]);

  const custList = (customers ?? []) as Cust[];
  const jobList = (jobs ?? []) as JobLite[];

  const agg = new Map<string, { jobs: number; revenue: number; lastAt: string }>();
  for (const j of jobList) {
    if (!j.customer_id) continue;
    const cur = agg.get(j.customer_id) ?? { jobs: 0, revenue: 0, lastAt: "" };
    cur.jobs++;
    cur.revenue += j.price ?? 0;
    if (!cur.lastAt || j.updated_at > cur.lastAt) cur.lastAt = j.updated_at;
    agg.set(j.customer_id, cur);
  }

  const rows: VipRow[] = custList.map((c) => {
    const a = agg.get(c.id) ?? { jobs: 0, revenue: 0, lastAt: "" };
    const tier = tierFor(a.jobs, a.revenue);
    return tier ? {
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      jobs: a.jobs, revenue: a.revenue,
      last_job_at: a.lastAt || null, tier,
    } : null;
  }).filter((r): r is VipRow => r !== null)
    .sort((a, b) => b.revenue - a.revenue);

  const counts = {
    platinum: rows.filter((r) => r.tier === "platinum").length,
    gold:     rows.filter((r) => r.tier === "gold").length,
    silver:   rows.filter((r) => r.tier === "silver").length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Crown className="h-3.5 w-3.5" /> Customers · VIPs</span>
          <h1 className="mt-2 display-h2">
            Your <em>best</em> people
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Auto-tiered by job count or lifetime revenue. Platinum gets
            white-glove. Silver gets the loyalty discount. Earn this
            group&apos;s referrals — they&apos;re your highest-conversion source.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Platinum" value={String(counts.platinum)} tone="violet" />
        <Stat label="Gold"     value={String(counts.gold)}     tone="amber" />
        <Stat label="Silver"   value={String(counts.silver)}   tone="ink" />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Ranked by lifetime revenue</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No VIPs yet. Customers earn a tier at 3+ jobs OR $5k+.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((r, i) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-ink-400 tabular-nums font-mono shrink-0 w-6 text-right">
                  {i + 1}
                </span>
                <Star className={`h-4 w-4 shrink-0 ${
                  r.tier === "platinum" ? "text-violet-600 fill-current" :
                  r.tier === "gold"     ? "text-amber-500 fill-current" :
                                          "text-ink-400 fill-current"
                }`} />
                <Link href={`/customers/${r.id}`} className="flex-1 min-w-0 hover:text-brand-600">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-ink-500 truncate">
                    {r.email && <>{r.email}</>}
                    {r.phone && r.email && " · "}
                    {r.phone && <span className="font-mono">{r.phone}</span>}
                  </div>
                </Link>
                <span className={`badge ${TIER_TONE[r.tier].bg}`}>
                  {r.tier.toUpperCase()}
                </span>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-sm tabular-nums font-mono font-semibold">
                    ${Math.round(r.revenue).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-ink-500 tabular-nums font-mono">
                    {r.jobs} job{r.jobs === 1 ? "" : "s"}
                    {r.last_job_at && ` · last ${new Date(r.last_job_at).toLocaleDateString()}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40 text-sm">
        <p>
          <strong>Tactic:</strong> when a VIP texts or calls, prioritize them.
          Send the platinum group a personalized holiday note every December.
          The silver tier converts best on a "loyalty discount" follow-up.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "violet" | "amber" | "ink" }) {
  const bg = tone === "violet" ? "bg-violet-50/80"
           : tone === "amber" ? "bg-amber-50/80"
           : "bg-ink-50/80";
  return (
    <div className={`card p-4 ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
