import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, type CFModule } from "@/lib/subscriptions";
import { OpenPortalButton } from "./OpenPortalButton";

export const dynamic = "force-dynamic";

interface CfSub {
  id: string;
  sub_brand: string;
  tier: string | null;
  status: string;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: subs }, { data: profile }] = await Promise.all([
    admin.from("cf_subscriptions")
      .select("id,sub_brand,tier,status,stripe_subscription_id,current_period_end")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    admin.from("profiles")
      .select("stripe_customer_id,credit_cents")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const active = (subs ?? []).filter((s) => s.status === "active" || s.status === "trialing") as CfSub[];
  const inactive = (subs ?? []).filter((s) => s.status !== "active" && s.status !== "trialing") as CfSub[];
  const hasCustomer = Boolean((profile as { stripe_customer_id?: string } | null)?.stripe_customer_id);
  const credit = (profile as { credit_cents?: number } | null)?.credit_cents ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><CreditCard className="h-3.5 w-3.5" /> Account</span>
        <h1 className="mt-2 display-h2">Billing</h1>
        <p className="mt-2 text-sm text-white/60">
          All Contractor Flow subscriptions in one place. Cancel, upgrade, or update payment method via the Stripe portal.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile label="Active modules"    value={String(active.length)} />
        <Tile label="Marketplace wallet" value={`$${(credit / 100).toFixed(0)}`} />
        <Tile label="Stripe customer"   value={hasCustomer ? "Linked" : "Not yet"} tone={hasCustomer ? "ok" : "warn"} />
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="section-title">Active subscriptions</h2>
          {hasCustomer && <OpenPortalButton />}
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-5 text-sm text-white/60">
            No active subscriptions. <Link href="/account/modules" className="text-brand-300 hover:underline">Unlock a module →</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((s) => (
              <li key={s.id} className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-white">{MODULE_LABELS[s.sub_brand as CFModule] ?? s.sub_brand}</div>
                  <div className="text-xs text-white/60 mt-0.5">
                    {s.tier ? `${s.tier} · ` : ""}
                    {s.status === "trialing" ? "Trial" : "Active"}
                    {s.current_period_end && ` · renews ${new Date(s.current_period_end).toLocaleDateString()}`}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inactive.length > 0 && (
        <section className="card p-5 space-y-3">
          <h2 className="section-title">Past subscriptions</h2>
          <ul className="space-y-2">
            {inactive.map((s) => (
              <li key={s.id} className="rounded-xl bg-white/[0.02] ring-1 ring-white/5 p-4 flex items-start justify-between gap-3 flex-wrap opacity-60">
                <div className="min-w-0">
                  <div className="font-semibold text-white/70">{MODULE_LABELS[s.sub_brand as CFModule] ?? s.sub_brand}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.tier ? `${s.tier} · ` : ""}{s.status}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 space-y-2">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-brand-300 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-white">Unlock more modules</div>
            <p className="text-sm text-white/60 mt-1">
              Marketplace ($49/mo) gives you 22 lead-gen sources + auto-postcards + AI receptionist. Launchpad ($1,997+) builds your website and runs your ads.
            </p>
          </div>
          <Link href="/account/modules" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 text-white font-semibold px-3 py-2 text-xs hover:bg-brand-400 transition shrink-0">
            View modules <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {!hasCustomer && (
        <section className="card p-4 bg-amber-500/10 ring-1 ring-amber-400/30 text-amber-100 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
          <div>
            You don&apos;t have a Stripe customer record yet — that&apos;s normal. It gets created automatically the moment you make your first purchase or top-up.
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
