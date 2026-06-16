import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Eye, Filter, MapPin, MessageSquare, Shield, Smartphone, Store, Target, Zap } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Marketplace · Real MA contractor leads",
  description: "Real homeowner leads with name + phone + address. Exclusive — never resold. $99/mo Starter, $499/mo Growth, $999/mo Pro. Launches Sept 23, 2026.",
};

const EMERALD = "#10b981";
const EMERALD_DARK = "#059669";
const APP_DOMAIN = "marketplace.contractorflowstore.com";

export default function MarketplacePage() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <MarketingNav current="marketplace" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              `radial-gradient(900px 500px at 80% -10%, ${EMERALD}33, transparent 60%),` +
              `radial-gradient(700px 400px at -10% 10%, ${EMERALD_DARK}22, transparent 60%)`,
          }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-5"
            style={{
              color: "#6ee7b7",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.32)",
              padding: "5px 12px",
              borderRadius: 999,
            }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Launching Sept 23, 2026
          </div>

          <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.03em" }}>
            Real <em style={{
              background: `linear-gradient(135deg, #34d399, ${EMERALD}, ${EMERALD_DARK})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>Massachusetts</em> contractor leads.<br />
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62em", fontStyle: "italic" }}>Exclusive. Never resold.</span>
          </h1>

          <p className="mt-7 text-lg max-w-2xl" style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
            Stop renting your business from Angi. Real homeowners filling out quote forms in your trade and ZIP — name, phone, address, project details. <span style={{ color: "#fff" }}>One contractor per lead.</span> No contract.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href={`https://${APP_DOMAIN}/signup`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${EMERALD}, ${EMERALD_DARK})`,
                color: "#fff",
                boxShadow: `0 14px 32px -10px ${EMERALD}88`,
              }}>
              Get early access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.14)",
              }}>
              See pricing
            </Link>
          </div>

          <div className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            First 50 contractors lock founding-member pricing for life · 7-day free trial · cancel anytime
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="border-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
          <Stat n="22" label="lead sources scraped 24/7" />
          <Stat n="1,247" label="MA residential permits/week" />
          <Stat n="1:1" label="exclusive, never resold" />
          <Stat n="$49" label="avg cost per lead" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#34d399" }}>How it works</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          Built for <em style={{ fontStyle: "italic", color: EMERALD }}>volume</em>, priced for <em style={{ fontStyle: "italic", color: EMERALD }}>margin.</em>
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={Target}        title="Lead density by ZIP"      body="See exactly how many qualified leads landed in your area this week before you subscribe." />
          <FeatureCard icon={Shield}        title="Exclusive, every lead"     body="Each lead goes to ONE contractor in the trade + ZIP. Never resold to your competitors." />
          <FeatureCard icon={Zap}           title="Real-time alerts"          body="SMS + email + native push the second a matching lead lands. First to call wins." />
          <FeatureCard icon={Filter}        title="Smart filtering"           body="Pick your trades, ZIPs, minimum budget, snooze when on vacation. You're in control." />
          <FeatureCard icon={MapPin}        title="Hyper-local"               body="Built for MA only. Knows our towns, permits, weather patterns, homeowner behavior." />
          <FeatureCard icon={MessageSquare} title="Free disputes"             body="If a lead doesn't match your filters, dispute it — auto-refunded back to your wallet." />
        </div>
      </section>

      {/* Pricing preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#34d399" }}>Pricing</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          Three tiers. <em style={{ fontStyle: "italic", color: EMERALD }}>Pick one.</em>
        </h2>
        <p className="mt-3 text-sm max-w-xl" style={{ color: "rgba(255,255,255,0.60)" }}>
          Cancel anytime. No contract. Each tier includes a monthly lead allotment. After that, overage is charged per-lead at your tier&apos;s rate.
        </p>

        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          <PriceCard tier="Starter"  price="$99"   leads="2"  overage="$60" popular={false} />
          <PriceCard tier="Growth"   price="$499"  leads="10" overage="$50" popular />
          <PriceCard tier="Pro"      price="$999"  leads="25" overage="$40" popular={false} />
        </div>

        <Link href="/pricing" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: EMERALD }}>
          See full pricing breakdown <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* CTA strip */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(800px 400px at 50% 50%, ${EMERALD}22, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1, letterSpacing: "-0.03em" }}>
            Be first when{" "}
            <em style={{
              background: `linear-gradient(135deg, #34d399, ${EMERALD}, ${EMERALD_DARK})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              filter: `drop-shadow(0 6px 20px ${EMERALD}55)`,
            }}>Marketplace launches.</em>
          </h2>
          <p className="mt-5 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
            Sept 23, 2026 · Founding-member pricing locked for life · 7-day free trial
          </p>

          <form action="/api/waitlist" method="POST"
            className="flex flex-col sm:flex-row gap-2 justify-center items-stretch mt-8 max-w-md mx-auto">
            <input type="hidden" name="module" value="marketplace" />
            <input name="email" type="email" required placeholder="you@yourbusiness.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
            <button type="submit"
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(135deg, ${EMERALD}, ${EMERALD_DARK})`,
                color: "#fff",
                boxShadow: `0 10px 22px -8px ${EMERALD}88`,
              }}>
              Get notified <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" style={{ color: EMERALD }} /> No spam
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" style={{ color: EMERALD }} /> Unsubscribe anytime
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" style={{ color: EMERALD }} /> ~1 email/month
            </span>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3">
            <Link href={`https://${APP_DOMAIN}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.75)" }}>
              Already have an account? Sign in <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 40, lineHeight: 1, color: "#fff" }}>{n}</div>
      <div className="mt-2 text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="p-5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3"
        style={{ background: `${EMERALD}1f`, border: `1px solid ${EMERALD}40`, color: EMERALD }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold text-white">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{body}</p>
    </div>
  );
}

function PriceCard({ tier, price, leads, overage, popular }: {
  tier: string; price: string; leads: string; overage: string; popular: boolean;
}) {
  return (
    <div className="relative p-6 rounded-2xl"
      style={{
        background: popular ? "rgba(16, 185, 129, 0.06)" : "rgba(255,255,255,0.03)",
        border: popular ? `1px solid ${EMERALD}40` : "1px solid rgba(255,255,255,0.07)",
      }}>
      {popular && (
        <span className="absolute -top-2.5 right-4 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold text-white"
          style={{ background: EMERALD }}>
          Most popular
        </span>
      )}
      <div className="text-xs uppercase tracking-wider font-mono" style={{ color: popular ? EMERALD : "rgba(255,255,255,0.50)" }}>{tier}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 56, lineHeight: 1, color: "#fff" }}>{price}</span>
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>/mo</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>{leads} leads/month included</span></li>
        <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>{overage}/lead after included</span></li>
        <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: EMERALD }} /><span style={{ color: "rgba(255,255,255,0.78)" }}>Cancel anytime · no contract</span></li>
      </ul>
    </div>
  );
}
