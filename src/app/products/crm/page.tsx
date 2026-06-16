import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BarChart3, Calendar, CheckCircle2, Download, ExternalLink, FileText, Inbox, MessageSquare, Smartphone, Sparkles, Users, Zap } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "CRM · The dashboard that runs your day",
  description: "Full CRM for MA contractors. Pipeline, customers, jobs, invoices, calendar. Native desktop app. $49-$149/mo.",
};

const INDIGO = "#6366f1";
const INDIGO_DARK = "#4f46e5";

export default function CRMPage() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <MarketingNav current="crm" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              `radial-gradient(900px 500px at 80% -10%, ${INDIGO}33, transparent 60%),` +
              `radial-gradient(700px 400px at -10% 10%, ${INDIGO_DARK}22, transparent 60%)`,
          }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-5"
            style={{
              color: "#a5b4fc",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.32)",
              padding: "5px 12px",
              borderRadius: 999,
            }}>
            Native desktop · macOS · Windows · Linux
          </div>

          <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.03em" }}>
            The <em style={{
              background: `linear-gradient(135deg, #818cf8, ${INDIGO}, #8b5cf6)`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>dashboard</em><br />
            that runs your day.
          </h1>

          <p className="mt-7 text-lg max-w-2xl" style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
            Pipeline, customers, jobs, invoices, calendar — connected and instant. Built as a real native app for contractors who close more by being faster, not by being everywhere.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/download/crm"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`,
                color: "#fff",
                boxShadow: `0 14px 32px -10px ${INDIGO}88`,
              }}>
              <Download className="h-4 w-4" /> Download for free
            </Link>
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.14)",
              }}>
              Create an account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            Free 14-day trial · No credit card · Cancel anytime
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
          <Stat n="<1s" label="lead → dashboard" />
          <Stat n="3x" label="follow-up frequency" />
          <Stat n="Native" label="not a browser tab" />
          <Stat n="$0" label="setup cost" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#a5b4fc" }}>What&apos;s in it</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          Everything you need. <em style={{ fontStyle: "italic", color: INDIGO }}>Nothing you don&apos;t.</em>
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={Inbox}        title="Lead pipeline"              body="Drag-and-drop kanban. New → Contacted → Quoted → Won. AI scores every lead so hot ones rise to the top." />
          <FeatureCard icon={Users}        title="Customers + jobs"            body="One source of truth for every project. Notes, photos, change orders, addresses — all linked." />
          <FeatureCard icon={FileText}     title="Quotes + invoices"           body="Branded PDFs in 30 seconds. Stripe-powered payments. Auto-reminders for overdue invoices." />
          <FeatureCard icon={Calendar}     title="Calendar + scheduling"       body="Crew assignment, time blocks, customer notifications. Syncs with Google + iCloud." />
          <FeatureCard icon={Sparkles}     title="AI follow-ups"               body="Drafts proposals, follow-up emails, and call notes. Approve in one click, send to leads instantly." />
          <FeatureCard icon={Smartphone}   title="Native push"                 body="System notifications when a lead lands. No browser, no missed call, no ghosted homeowner." />
        </div>
      </section>

      {/* Pricing snippet */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "#a5b4fc" }}>Pricing</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
          Three tiers. <em style={{ fontStyle: "italic", color: INDIGO }}>One CRM.</em>
        </h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          <CRMPriceCard tier="Starter" price="$49"  blurb="Solo operator. Up to 50 leads/mo." popular={false} />
          <CRMPriceCard tier="Growth"  price="$79"  blurb="AI follow-ups. Unlimited leads." popular />
          <CRMPriceCard tier="Pro"     price="$149" blurb="Multi-user. Custom branding. Priority support." popular={false} />
        </div>
        <Link href="/pricing" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: INDIGO }}>
          See full pricing breakdown <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* CTA strip */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(800px 400px at 50% 50%, ${INDIGO}22, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1, letterSpacing: "-0.03em" }}>
            Ready to{" "}
            <em style={{
              background: `linear-gradient(135deg, #818cf8, ${INDIGO}, #8b5cf6)`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              filter: `drop-shadow(0 6px 20px ${INDIGO}55)`,
            }}>ditch the spreadsheet?</em>
          </h2>
          <p className="mt-5 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
            Free 14-day trial · No credit card · macOS · Windows · Linux
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/download/crm"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`,
                color: "#fff",
                boxShadow: `0 14px 32px -10px ${INDIGO}88`,
              }}>
              <Download className="h-4 w-4" /> Download CRM
            </Link>
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.14)",
              }}>
              Sign up first
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

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="p-5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3"
        style={{ background: `${INDIGO}1f`, border: `1px solid ${INDIGO}40`, color: INDIGO }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold text-white">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{body}</p>
    </div>
  );
}

function CRMPriceCard({ tier, price, blurb, popular }: { tier: string; price: string; blurb: string; popular: boolean }) {
  return (
    <div className="relative p-6 rounded-2xl"
      style={{
        background: popular ? "rgba(99, 102, 241, 0.06)" : "rgba(255,255,255,0.03)",
        border: popular ? `1px solid ${INDIGO}40` : "1px solid rgba(255,255,255,0.07)",
      }}>
      {popular && (
        <span className="absolute -top-2.5 right-4 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold text-white"
          style={{ background: INDIGO }}>
          Most popular
        </span>
      )}
      <div className="text-xs uppercase tracking-wider font-mono" style={{ color: popular ? INDIGO : "rgba(255,255,255,0.50)" }}>{tier}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 56, lineHeight: 1, color: "#fff" }}>{price}</span>
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>/mo</span>
      </div>
      <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{blurb}</p>
    </div>
  );
}
