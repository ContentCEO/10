import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserModules, MODULE_LABELS, type CFModule } from "@/lib/subscriptions";
import { CF_PRODUCTS } from "@/lib/cf-products";
import { ModuleCheckoutButton } from "./ModuleCheckoutButton";

export const dynamic = "force-dynamic";

const MODULE_ORDER: CFModule[] = [
  "cf-crm", "cf-marketplace", "cf-launchpad", "cf-academy", "cf-capital",
];

const MODULE_BLURB: Record<CFModule, string> = {
  "cf-crm":          "Daily-driver pipeline. Leads, customers, jobs, invoices, proposals, AI follow-ups.",
  "cf-marketplace":  "Lead-gen engine. 22 MA scrapers, BatchData phone enrichment, Lob auto-postcards, Meta Lead Ads webhook, Vapi voice receptionist.",
  "cf-launchpad":    "Agency-built website + Google + Meta ads + monthly strategy. We run it, you take the leads.",
  "cf-academy":      "Training courses. (Coming.)",
  "cf-capital":      "Invoice factoring — get paid same-day, customer pays us later. (Coming.)",
};

export default async function ModulesPage({ searchParams }: { searchParams: { status?: string; module?: string; locked?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id,is_admin").eq("id", user.id).single();

  const active = await getUserModules(
    supabase,
    { id: user.id, email: user.email ?? null },
    profile ? { id: user.id, is_admin: (profile as { is_admin?: boolean }).is_admin } : null,
  );
  const activeSet = new Set(active);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Your account</span>
        <h1 className="mt-2 display-h2">Modules</h1>
        <p className="mt-2 text-sm text-white/60">
          Unlock more of Contractor Flow. One login, one bill — features just appear in your sidebar as you add them.
        </p>
      </header>

      {searchParams.locked && (
        <div className="card p-4 bg-brand-500/[0.10] ring-1 ring-brand-400/40 text-brand-100 text-sm flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-brand-300 mt-0.5 shrink-0" />
          <div>
            <strong>Unlock {MODULE_LABELS[searchParams.locked as CFModule] ?? searchParams.locked}</strong> to access that page. Pick a tier below to enable it instantly.
          </div>
        </div>
      )}

      {searchParams.status === "success" && (
        <div className="card p-4 bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-100 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
          <div>
            <strong>Module activated.</strong> {searchParams.module
              ? <>You&apos;ll see {MODULE_LABELS[searchParams.module as CFModule]} in your sidebar within a few seconds.</>
              : <>Refresh in a moment to see your new module in the sidebar.</>}
          </div>
        </div>
      )}
      {searchParams.status === "cancelled" && (
        <div className="card p-4 bg-amber-500/10 ring-1 ring-amber-400/30 text-amber-100 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
          Checkout cancelled. No charge.
        </div>
      )}

      <section className="space-y-4">
        {MODULE_ORDER.map((mod) => {
          const products = CF_PRODUCTS.filter((p) => p.module === mod);
          const isActive = activeSet.has(mod);
          const isComing = products.length === 0;

          return (
            <article key={mod} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl text-white">{MODULE_LABELS[mod]}</h2>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                    {isComing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 text-white/60 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/60 max-w-xl">{MODULE_BLURB[mod]}</p>
                </div>
              </div>

              {products.length > 0 && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <div key={p.envKey} className={p.recommended
                      ? "rounded-xl ring-1 ring-brand-400/40 bg-brand-500/[0.08] p-4 relative"
                      : "rounded-xl ring-1 ring-white/10 bg-white/[0.03] p-4"}>
                      {p.recommended && (
                        <div className="absolute -top-2 right-3 bg-brand-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                          Recommended
                        </div>
                      )}
                      <div className="font-semibold text-white">{p.tier}</div>
                      <div className="mt-1 text-2xl font-semibold text-white tabular-nums">
                        {p.monthlyCents != null && <>${(p.monthlyCents / 100).toFixed(0)}<span className="text-sm font-normal text-white/50">/mo</span></>}
                        {p.oneTimeCents != null && <>${(p.oneTimeCents / 100).toFixed(0)}<span className="text-sm font-normal text-white/50"> one-time</span></>}
                      </div>
                      <p className="mt-2 text-xs text-white/60 leading-relaxed">{p.description}</p>
                      <div className="mt-3">
                        <ModuleCheckoutButton envKey={p.envKey} isActive={isActive} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="text-xs text-white/40">
        Billed via Stripe. Cancel anytime in <a href="/billing" className="text-brand-300 hover:underline">Billing</a>. Modules unlock instantly on payment; sidebar updates on next page load.
      </p>
    </div>
  );
}
