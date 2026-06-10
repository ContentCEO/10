import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Marketplace, CRM, and Launchpad pricing. No contracts. Cancel anytime.",
};

interface Plan {
  module: string;
  moduleColor: string;
  name: string;
  price: string;
  cadence: string;
  highlight?: string;
  status: "live" | "soon" | "dated";
  statusLabel?: string;
  desc: string;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    module: "Marketplace",
    moduleColor: "#10b981",
    name: "Standard",
    price: "$49",
    cadence: "/month",
    status: "dated",
    statusLabel: "Launches Sept 23",
    desc: "Real MA homeowner leads. Exclusive. No contract.",
    features: [
      "Unlimited leads in your trade + ZIP",
      "Name, phone, address — verified",
      "Push + SMS the moment a lead lands",
      "Cancel anytime, no contract",
      "Free first 7 days",
    ],
    cta: "Get notified",
  },
  {
    module: "CRM",
    moduleColor: "#6366f1",
    name: "Starter",
    price: "$49",
    cadence: "/month",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "Lead pipeline, customers, jobs, invoices. Solo operator.",
    features: [
      "Up to 50 leads / month",
      "Pipeline + customers + jobs",
      "Quote + invoice builder",
      "Calendar + reminders",
    ],
    cta: "Notify me",
  },
  {
    module: "CRM",
    moduleColor: "#6366f1",
    name: "Growth",
    price: "$79",
    cadence: "/month",
    highlight: "MOST POPULAR (when live)",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "Everything in Starter, plus AI follow-ups + sequences.",
    features: [
      "Unlimited leads",
      "AI auto-replies to inbound",
      "Email + SMS sequences",
      "Native desktop app",
      "Push notifications",
    ],
    cta: "Notify me",
  },
  {
    module: "CRM",
    moduleColor: "#6366f1",
    name: "Pro",
    price: "$149",
    cadence: "/month",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "Multi-user, custom branding, priority support.",
    features: [
      "Everything in Growth",
      "Multi-user team accounts",
      "Custom branding on portals",
      "Priority support (same-day)",
      "Custom reports",
    ],
    cta: "Notify me",
  },
  {
    module: "Launchpad",
    moduleColor: "#f97316",
    name: "Foundation",
    price: "$1,997",
    cadence: "one-time",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "Custom 5-page site, mobile-fast, SEO + GBP. 14-day delivery.",
    features: [
      "Custom 5-page website",
      "Mobile-fast, 100/100 PageSpeed",
      "Google Business Profile sync",
      "Contact form → CRM (CRM free 30d)",
      "2 revision rounds included",
    ],
    cta: "Notify me",
  },
  {
    module: "Launchpad",
    moduleColor: "#f97316",
    name: "Foundation + Growth",
    price: "$997",
    cadence: "setup + $997/mo",
    highlight: "BEST VALUE",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "We build it, we run your ads, we report back monthly.",
    features: [
      "Everything in Foundation",
      "Google Ads + Meta Ads management",
      "Monthly performance report",
      "Monthly strategy call",
      "CF CRM free for 6 months",
      "6-month minimum",
    ],
    cta: "Notify me",
  },
  {
    module: "Launchpad",
    moduleColor: "#f97316",
    name: "Revenue Share",
    price: "$497",
    cadence: "setup + $497/mo + 8%",
    status: "soon",
    statusLabel: "Coming soon",
    desc: "Aligned incentives — we win when you win.",
    features: [
      "Everything in Foundation + Growth",
      "8% of attributed revenue",
      "12-month minimum",
      "Lower upfront, longer commitment",
    ],
    cta: "Notify me",
  },
];

export default function PricingPage() {
  const grouped = {
    Marketplace: PLANS.filter((p) => p.module === "Marketplace"),
    CRM:         PLANS.filter((p) => p.module === "CRM"),
    Launchpad:   PLANS.filter((p) => p.module === "Launchpad"),
  };

  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 500px at 80% -10%, rgba(16, 185, 129, 0.18), transparent 60%)," +
            "radial-gradient(700px 400px at -10% 10%, rgba(99, 102, 241, 0.14), transparent 60%)," +
            "radial-gradient(700px 400px at 100% 50%, rgba(249, 115, 22, 0.10), transparent 60%)",
        }} />

      <div className="max-w-6xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition mb-10">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-300 mb-3">
            <Sparkles className="h-3 w-3" /> Pricing
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl tracking-tight leading-[1.02]">
            Pay for what you <em className="italic text-emerald-300">use.</em>
          </h1>
          <p className="mt-5 text-base text-white/60">
            Three modules. Unlock what you need. Cancel anytime. No contracts.
          </p>
        </div>

        {(["Marketplace", "CRM", "Launchpad"] as const).map((mod) => (
          <section key={mod} className="mt-16">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
              <h2 className="font-serif text-3xl tracking-tight" style={{ color: grouped[mod][0]?.moduleColor }}>
                {mod}
              </h2>
              <div className="text-xs text-white/50">
                {mod === "Marketplace" && "Real MA homeowner leads. Exclusive."}
                {mod === "CRM"         && "The dashboard that runs your day."}
                {mod === "Launchpad"   && "We build your site + run your ads."}
              </div>
            </div>
            <div className={`grid gap-3 ${grouped[mod].length === 1 ? "md:grid-cols-1 max-w-md" : grouped[mod].length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {grouped[mod].map((p) => <PlanCard key={p.module + p.name} plan={p} />)}
            </div>
          </section>
        ))}

        <div className="mt-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30 p-7 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-300">Founding members</div>
          <h3 className="mt-2 font-serif text-2xl tracking-tight">First 50 contractors lock in $49/mo for life.</h3>
          <p className="mt-3 text-sm text-white/70 max-w-lg mx-auto">
            Get on the Marketplace waitlist before Sept 23 — pricing for early signups never increases, even when we raise rates.
          </p>
          <Link href="/" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 text-sm transition">
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function PlanCard({ plan: p }: { plan: Plan }) {
  const isLive = p.status === "live";
  const isDated = p.status === "dated";

  return (
    <div className="relative rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.03]"
      style={{ boxShadow: `0 10px 30px -16px ${p.moduleColor}33` }}>
      {p.highlight && (
        <div className="absolute -top-2.5 right-4 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider"
          style={{
            background: p.moduleColor,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}>
          {p.highlight}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wider font-mono" style={{ color: p.moduleColor }}>{p.name}</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-serif tracking-tight">{p.price}</span>
            <span className="text-xs text-white/50">{p.cadence}</span>
          </div>
        </div>
        {p.statusLabel && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider"
            style={{
              background: isDated ? `${p.moduleColor}22` : "rgba(255,255,255,0.06)",
              color: isDated ? p.moduleColor : "rgba(255,255,255,0.6)",
              border: `1px solid ${isDated ? `${p.moduleColor}55` : "rgba(255,255,255,0.10)"}`,
              fontWeight: 600,
            }}>
            {p.statusLabel}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-white/70 leading-relaxed">{p.desc}</p>
      <ul className="mt-4 space-y-2">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: p.moduleColor }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-6 block text-center w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
        style={{
          background: isLive ? p.moduleColor : "transparent",
          color: isLive ? "#fff" : p.moduleColor,
          border: isLive ? "none" : `1px solid ${p.moduleColor}55`,
        }}>
        {p.cta}
      </Link>
    </div>
  );
}
