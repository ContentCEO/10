import { Calendar, Sparkles, Workflow } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SeedDefaultsButton } from "./SeedDefaultsButton";

export const dynamic = "force-dynamic";

interface DripSeq {
  id: string;
  name: string;
  description: string | null;
  steps: { delay_days: number; channel: string; prompt: string }[];
  is_active: boolean;
}
interface Seasonal {
  id: string;
  name: string;
  description: string | null;
  trigger_month: number;
  trigger_day: number;
  target_services: string[];
  is_active: boolean;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function SequencesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: drips }, { data: seasonals }, { count: activeEnrollments }] = await Promise.all([
    supabase.from("drip_sequences").select("*").order("created_at", { ascending: false }),
    supabase.from("seasonal_campaigns").select("*").order("trigger_month").order("trigger_day"),
    supabase.from("drip_enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const dripList = (drips ?? []) as DripSeq[];
  const seasonalList = (seasonals ?? []) as Seasonal[];

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Workflow className="h-3.5 w-3.5" /> Automation</span>
          <h1 className="mt-2 display-h2">Sequences &amp; campaigns</h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Multi-step nurture cadences that auto-send AI-drafted touches, and
            seasonal campaigns that hit your past customer book on the right day.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
              {dripList.length} sequences
            </span>
            <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">
              {activeEnrollments ?? 0} active enrollments
            </span>
            <span className="badge bg-amber-100 text-amber-700 ring-amber-200">
              {seasonalList.length} seasonal campaigns
            </span>
          </div>
        </div>
      </header>

      {dripList.length === 0 && seasonalList.length === 0 && (
        <div className="card p-7 text-center">
          <Sparkles className="h-8 w-8 text-brand-500 mx-auto mb-3" />
          <h2 className="display-h2 text-2xl">Get started with defaults</h2>
          <p className="mt-2 lede max-w-md mx-auto">
            We&apos;ll create 4 proven sequences (cold nurture, quoted-not-closed,
            post-job upsell, win-back) + 5 seasonal campaigns (spring deep clean,
            fall gutters, winter HVAC, snow signup, pre-spring landscaping).
          </p>
          <div className="mt-5">
            <SeedDefaultsButton />
          </div>
        </div>
      )}

      {dripList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Drip sequences</h2>
            {seasonalList.length === 0 && <SeedDefaultsButton />}
          </div>
          <ul className="space-y-3">
            {dripList.map((d) => (
              <li key={d.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight">{d.name}</h3>
                    {d.description && (
                      <p className="text-sm text-ink-600 mt-1">{d.description}</p>
                    )}
                  </div>
                  <span className={`badge text-[10px] ${d.is_active ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-ink-100 text-ink-600 ring-ink-200"}`}>
                    {d.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <ol className="mt-4 space-y-1.5 text-xs">
                  {d.steps.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="font-mono text-ink-400 w-12 shrink-0">D+{s.delay_days}</span>
                      <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">{s.channel.toUpperCase()}</span>
                      <span className="text-ink-700 line-clamp-1">{s.prompt}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      )}

      {seasonalList.length > 0 && (
        <section>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-brand-600" /> Seasonal campaigns
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {seasonalList.map((c) => (
              <li key={c.id} className="card card-hover p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold tracking-tight text-sm">{c.name}</h3>
                  <span className="badge bg-brand-100 text-brand-700 ring-brand-200 text-[10px]">
                    {MONTHS[c.trigger_month - 1]} {c.trigger_day}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-ink-600 mt-1.5">{c.description}</p>
                )}
                {c.target_services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.target_services.map((s) => (
                      <span key={s} className="badge bg-ink-50 text-ink-600 ring-ink-200 text-[10px]">{s}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
