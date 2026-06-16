import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARKETPLACE_TIERS, getTier, formatCents } from "@/lib/marketplace-tiers";
import { SubscribeButton } from "./SubscribeButton";
import { OpenPortalButton } from "./OpenPortalButton";

export const dynamic = "force-dynamic";

const EMERALD = "#10b981";

interface Subscription {
  tier: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  leads_used_this_period: number;
  stripe_subscription_id: string | null;
}

export default async function AccountPage({ searchParams }: { searchParams: { checkout?: string; tier?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: subRow } = await admin
    .from("marketplace_subscriptions")
    .select("tier,status,current_period_end,cancel_at_period_end,leads_used_this_period,stripe_subscription_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const sub        = subRow as Subscription | null;
  const currentTier = sub?.tier ? getTier(sub.tier) : undefined;
  const activeSub  = sub && ["trialing", "active"].includes(sub.status);
  const checkoutOk = searchParams.checkout === "success";

  return (
    <div className="space-y-6">
      {checkoutOk && (
        <div className="rounded-2xl p-5"
          style={{ background: `${EMERALD}14`, border: `1px solid ${EMERALD}40` }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: `${EMERALD}22`, color: EMERALD }}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-lg">You&apos;re in 🎉</div>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                Subscription active. Your 7-day free trial just started. We&apos;ll alert you the moment a matching lead lands.
              </p>
            </div>
          </div>
        </div>
      )}

      <header>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color: "#6ee7b7" }}>Account</div>
        <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 48, lineHeight: 1.05, letterSpacing: "-0.02em" }} className="mt-2">
          Subscription
        </h1>
      </header>

      {/* Current subscription */}
      {activeSub && currentTier ? (
        <section className="rounded-2xl p-6"
          style={{ background: "rgba(16, 185, 129, 0.06)", border: `1px solid ${EMERALD}40` }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider font-mono" style={{ color: EMERALD }}>
                Current tier · {sub.status === "trialing" ? "Free trial" : "Active"}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 56, lineHeight: 1 }}>{currentTier.name}</span>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{formatCents(currentTier.monthlyCents)}/mo</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{currentTier.description}</p>

              {/* Usage */}
              <div className="mt-5 max-w-md">
                <div className="flex items-baseline justify-between text-xs mb-2">
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>Leads this period</span>
                  <span className="tabular-nums" style={{ color: "#fff" }}>
                    {sub.leads_used_this_period} / {currentTier.includedLeads}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (sub.leads_used_this_period / Math.max(1, currentTier.includedLeads)) * 100)}%`,
                      background: `linear-gradient(90deg, ${EMERALD}, #059669)`,
                    }} />
                </div>
                <div className="mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                  After your included quota: {formatCents(currentTier.overagePerLeadCents)} per additional lead.
                  {sub.current_period_end && ` Renews ${new Date(sub.current_period_end).toLocaleDateString()}.`}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <OpenPortalButton />
              {sub.cancel_at_period_end && (
                <div className="text-[11px] text-center px-3 py-1.5 rounded-lg"
                  style={{ color: "#fcd34d", background: "rgba(245, 158, 11, 0.10)", border: "1px solid rgba(245, 158, 11, 0.32)" }}>
                  Cancels {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "soon"}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Tier options */}
      <section>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-xl font-semibold">
            {activeSub ? "Switch tier" : "Pick a tier"}
          </h2>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
            7-day free trial · cancel anytime · no contract
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {MARKETPLACE_TIERS.map((t) => {
            const isCurrent = currentTier?.slug === t.slug;
            return (
              <div key={t.slug} className="relative rounded-2xl p-5"
                style={{
                  background: t.recommended ? "rgba(16, 185, 129, 0.06)" : "rgba(255,255,255,0.03)",
                  border: t.recommended ? `1px solid ${EMERALD}40` : "1px solid rgba(255,255,255,0.07)",
                }}>
                {t.recommended && (
                  <span className="absolute -top-2.5 right-4 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold text-white"
                    style={{ background: EMERALD }}>
                    Most popular
                  </span>
                )}
                <div className="text-xs uppercase tracking-wider font-mono" style={{ color: t.recommended ? EMERALD : "rgba(255,255,255,0.50)" }}>{t.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 48, lineHeight: 1 }}>{formatCents(t.monthlyCents)}</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>/mo</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>{t.includedLeads} leads/mo included</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>{formatCents(t.overagePerLeadCents)}/lead after</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>Cancel anytime</span></li>
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <div className="w-full text-center py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}>
                      Current plan
                    </div>
                  ) : activeSub ? (
                    <OpenPortalButton label={`Switch to ${t.name}`} />
                  ) : (
                    <SubscribeButton tier={t.slug} label={`Start ${t.name} trial`} accent={t.recommended} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stripe link */}
      {activeSub && (
        <section className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4" style={{ color: EMERALD }} />
            <div className="text-sm">
              <div className="font-semibold">Billing managed by Stripe</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Update your card, change plan, see invoices.
              </div>
            </div>
            <div className="ml-auto">
              <OpenPortalButton label="Open portal" iconOnly />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
