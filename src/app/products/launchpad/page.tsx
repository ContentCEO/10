import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, ExternalLink, Globe, MessageSquare, Palette, Rocket, Shield, Smartphone, Sparkles, Target, TrendingUp } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Launchpad · We build your site + run your ads",
  description: "Done-for-you website + Google + Meta ads + monthly reports for MA contractors. $1,997 one-time or $497/mo. Coming soon.",
};

const ORANGE = "#f97316";
const ORANGE_DARK = "#ea580c";
const APP_DOMAIN = "launchpad.contractorflowstore.com";

export default function LaunchpadPage() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <MarketingNav current="launchpad" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              `radial-gradient(900px 500px at 80% -10%, ${ORANGE}33, transparent 60%),` +
              `radial-gradient(700px 400px at -10% 10%, ${ORANGE_DARK}22, transparent 60%)`,
          }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-5"
            style={{
              color: "#fdba74",
              background: "rgba(249, 115, 22, 0.12)",
              border: "1px solid rgba(249, 115, 22, 0.32)",
              padding: "5px 12px",
              borderRadius: 999,
            }}>
            Done-for-you · Launching Q1 2027
          </div>

          <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.03em" }}>
            We build your <em style={{
              background: `linear-gradient(135deg, #fdba74, ${ORANGE}, ${ORANGE_DARK})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>website.</em><br />
            We run your <em style={{
              background: `linear-gradient(135deg, #fdba74, ${ORANGE}, ${ORANGE_DARK})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>ads.</em><br />
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62em", fontStyle: "italic" }}>You take the leads.</span>
          </h1>

          <p className="mt-7 text-lg max-w-2xl" style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
            Hyper-local agency service for MA contractors. We design + build your site, manage Google + Meta ads, send you a monthly report, and feed leads straight to your phone. <span style={{ color: "#fff" }}>You stop guessing at marketing.</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
                color: "#fff",
                boxShadow: `0 14px 32px -10px ${ORANGE}88`,
              }}>
              See pricing <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#waitlist"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.14)",
              }}>
              Join the waitlist
            </a>
          </div>

          <div className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            14-day site delivery · Money-back if not live in 30 days
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
          <Stat n="14d" label="from kickoff to live" />
          <Stat n="2" label="revision rounds free" />
          <Stat n="100/100" label="Google PageSpeed target" />
          <Stat n="MA only" label="hyper-local focus" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#fdba74" }}>What you get</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          A full <em style={{ fontStyle: "italic", color: ORANGE }}>marketing team.</em> One monthly fee.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={Palette}      title="Custom website"             body="Real design, mobile-fast, SEO-ready. GBP synced. 14-day delivery. 2 revision rounds free." />
          <FeatureCard icon={TrendingUp}   title="Google + Meta ads"          body="We set up campaigns, write copy, optimize bids weekly. You stay the account owner." />
          <FeatureCard icon={Target}       title="Lead tracking"              body="Every lead routes into Contractor Flow CRM (included free for 6 months on Growth tier)." />
          <FeatureCard icon={Sparkles}     title="Monthly performance report" body="Spend, leads, cost-per-lead, what we changed, what we&apos;ll change next. PDF + Loom walkthrough." />
          <FeatureCard icon={MessageSquare} title="Direct line"               body="Slack-style chat with Davi + the team. Same-day response for urgent issues." />
          <FeatureCard icon={Shield}       title="Money back guarantee"       body="Foundation tier: not live in 30 days, full refund. No fine print, no holdbacks." />
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#fdba74" }}>Pricing</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          Pick your <em style={{ fontStyle: "italic", color: ORANGE }}>commitment.</em>
        </h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          <LPCard tier="Foundation"    price="$1,997" cadence="one-time"           blurb="Custom site + GBP. 14-day delivery." popular={false} />
          <LPCard tier="Growth"        price="$497"   cadence="setup + $497/mo"    blurb="Foundation + ads + reports + monthly call." popular />
          <LPCard tier="Revenue Share" price="$0"     cadence="setup + 12% rev"    blurb="No upfront. Aligned incentives. We win when you do." popular={false} />
        </div>
        <Link href="/pricing" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: ORANGE }}>
          See full pricing breakdown <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* CTA */}
      <section id="waitlist" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(800px 400px at 50% 50%, ${ORANGE}22, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1, letterSpacing: "-0.03em" }}>
            Be first when{" "}
            <em style={{
              background: `linear-gradient(135deg, #fdba74, ${ORANGE}, ${ORANGE_DARK})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              filter: `drop-shadow(0 6px 20px ${ORANGE}55)`,
            }}>Launchpad opens.</em>
          </h2>
          <p className="mt-5 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
            Q1 2027 · First 10 clients get founding-member rates locked
          </p>

          <form action="/api/waitlist" method="POST"
            className="flex flex-col sm:flex-row gap-2 justify-center items-stretch mt-8 max-w-md mx-auto">
            <input type="hidden" name="module" value="launchpad" />
            <input name="email" type="email" required placeholder="you@yourbusiness.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
            <button type="submit"
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
                color: "#fff",
                boxShadow: `0 10px 22px -8px ${ORANGE}88`,
              }}>
              Join waitlist <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-12">
            <Link href={`https://${APP_DOMAIN}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.75)" }}>
              Already a Launchpad client? Sign in <ExternalLink className="h-3 w-3" />
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

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Rocket; title: string; body: string }) {
  return (
    <div className="p-5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3"
        style={{ background: `${ORANGE}1f`, border: `1px solid ${ORANGE}40`, color: ORANGE }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold text-white">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{body}</p>
    </div>
  );
}

function LPCard({ tier, price, cadence, blurb, popular }: {
  tier: string; price: string; cadence: string; blurb: string; popular: boolean;
}) {
  return (
    <div className="relative p-6 rounded-2xl"
      style={{
        background: popular ? "rgba(249, 115, 22, 0.06)" : "rgba(255,255,255,0.03)",
        border: popular ? `1px solid ${ORANGE}40` : "1px solid rgba(255,255,255,0.07)",
      }}>
      {popular && (
        <span className="absolute -top-2.5 right-4 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold text-white"
          style={{ background: ORANGE }}>
          Most popular
        </span>
      )}
      <div className="text-xs uppercase tracking-wider font-mono" style={{ color: popular ? ORANGE : "rgba(255,255,255,0.50)" }}>{tier}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 56, lineHeight: 1, color: "#fff" }}>{price}</span>
      </div>
      <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{cadence}</div>
      <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{blurb}</p>
    </div>
  );
}
