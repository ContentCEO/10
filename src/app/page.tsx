import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Rocket, Store, Users } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Contractor Flow — one lead, one contractor",
  description: "The operating system for Massachusetts contractors. CRM, Marketplace, Launchpad — one ecosystem, three modules. Built in MA, founder-led, hyper-local.",
};

const MODULES = [
  {
    slug: "crm",
    name: "CRM",
    tagline: "The dashboard that runs your day.",
    desc: "Lead pipeline, customers, jobs, invoices, calendar — all native. Built for contractors who close more by being faster.",
    cta: "Download free",
    href: "/crm",
    accent: "#6366f1",
    accent2: "#4f46e5",
    icon: Users,
    status: "Available now",
    statusColor: "#34d399",
  },
  {
    slug: "marketplace",
    name: "Marketplace",
    tagline: "Real MA homeowner leads.",
    desc: "Exclusive leads in your trade + ZIP. Name, phone, address. Never resold. $99-$999/mo.",
    cta: "Get early access",
    href: "/marketplace",
    accent: "#10b981",
    accent2: "#059669",
    icon: Store,
    status: "Sept 23, 2026",
    statusColor: "#34d399",
  },
  {
    slug: "launchpad",
    name: "Launchpad",
    tagline: "Done-for-you site + ads.",
    desc: "We build it, we run it, you take the leads. From $1,997 one-time or $497/mo with revenue share.",
    cta: "Join waitlist",
    href: "/launchpad",
    accent: "#f97316",
    accent2: "#ea580c",
    icon: Rocket,
    status: "Q1 2027",
    statusColor: "rgba(255,255,255,0.55)",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <MarketingNav current="home" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(800px 480px at 20% 10%, rgba(99, 102, 241, 0.32), transparent 60%)," +
              "radial-gradient(700px 420px at 80% 0%, rgba(16, 185, 129, 0.28), transparent 60%)," +
              "radial-gradient(600px 360px at 50% 80%, rgba(249, 115, 22, 0.20), transparent 60%)",
          }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-5"
            style={{
              color: "rgba(255,255,255,0.70)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "5px 12px",
              borderRadius: 999,
            }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Built in Massachusetts · Founder-led
          </div>

          <h1 style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: "clamp(56px, 10vw, 124px)",
            lineHeight: 0.92,
            letterSpacing: "-0.035em",
            maxWidth: 980,
          }}>
            The operating system for{" "}
            <em style={{
              background: "linear-gradient(135deg, #818cf8, #6366f1, #10b981, #f97316)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              filter: "drop-shadow(0 8px 30px rgba(99, 102, 241, 0.45))",
            }}>Massachusetts contractors.</em>
          </h1>

          <p className="mt-7 text-lg max-w-2xl" style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
            Three modules. One ecosystem. Pick what you need — CRM, Marketplace, Launchpad — and ignore what you don&apos;t. Built by one person, for one state, for the trades.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                boxShadow: "0 14px 32px -10px #10b98188",
              }}>
              See Marketplace · Launching Sept 23 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/crm"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.14)",
              }}>
              Download CRM
            </Link>
          </div>
        </div>
      </section>

      {/* Module cards */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>The ecosystem</div>
        <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5.5vw, 64px)", letterSpacing: "-0.025em" }}>
          Three modules. <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.55)" }}>Pick what you need.</em>
        </h2>
        <p className="mt-3 text-base max-w-2xl" style={{ color: "rgba(255,255,255,0.60)" }}>
          Each module is its own app — own login, own subscription, own purpose. Buy one, buy all three, change your mind any time.
        </p>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.slug} href={m.href}
                className="group relative p-6 rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: `0 10px 30px -16px ${m.accent}44`,
                }}>
                <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none transition-opacity"
                  style={{ background: `radial-gradient(circle, ${m.accent}55 0%, transparent 70%)`, filter: "blur(32px)" }} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${m.accent}, ${m.accent2})`,
                        color: "#fff",
                      }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold"
                      style={{
                        color: m.statusColor,
                        background: `${m.accent}1a`,
                        border: `1px solid ${m.accent}40`,
                      }}>
                      {m.status}
                    </span>
                  </div>

                  <div className="mt-5" style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 28, lineHeight: 1.05, color: "#fff" }}>
                    Contractor Flow <em style={{ fontStyle: "italic" }}>{m.name}</em>
                  </div>
                  <div className="mt-1.5 text-sm" style={{ color: m.accent }}>{m.tagline}</div>
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{m.desc}</p>

                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2 transition-all"
                    style={{ color: m.accent }}>
                    {m.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why MA */}
      <section className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>Why Massachusetts</div>
          <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(36px, 5.5vw, 64px)", letterSpacing: "-0.025em" }}>
            <em style={{ fontStyle: "italic" }}>Hyper-local</em> is the moat.
          </h2>
          <p className="mt-4 text-base max-w-2xl" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
            Silicon Valley builds for a generic &ldquo;small business&rdquo; that lives in three time zones. Angi sells the same lead to five competitors. Both feel rented, not owned. We picked one state — ours — and built every feature for it. Towns. Permits. Weather patterns. The way North Shore homeowners actually talk.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <Pillar label="One state" body="Built for MA — not for everyone, not for nobody." />
            <Pillar label="Founder-led" body="One developer. One designer. One support line. Real accountability." />
            <Pillar label="Modular" body="Take only what you need. Cancel anytime. No lock-in." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(600px 320px at 50% 50%, rgba(99, 102, 241, 0.22), transparent 60%)",
          }} />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1, letterSpacing: "-0.03em" }}>
            Start <em style={{
              background: "linear-gradient(135deg, #818cf8, #6366f1, #10b981, #f97316)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}>somewhere.</em>
          </h2>
          <p className="mt-5 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
            CRM is live today · Marketplace launches Sept 23 · Launchpad opens Q1 2027
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/crm" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border"
              style={{ background: "rgba(99, 102, 241, 0.12)", color: "#a5b4fc", borderColor: "rgba(99, 102, 241, 0.32)" }}>
              <Users className="h-4 w-4" /> CRM
            </Link>
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border"
              style={{ background: "rgba(16, 185, 129, 0.12)", color: "#6ee7b7", borderColor: "rgba(16, 185, 129, 0.32)" }}>
              <Store className="h-4 w-4" /> Marketplace
            </Link>
            <Link href="/launchpad" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border"
              style={{ background: "rgba(249, 115, 22, 0.12)", color: "#fdba74", borderColor: "rgba(249, 115, 22, 0.32)" }}>
              <Rocket className="h-4 w-4" /> Launchpad
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Pillar({ label, body }: { label: string; body: string }) {
  return (
    <div className="p-5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>{body}</p>
    </div>
  );
}
