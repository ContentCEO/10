import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hammer,
  LineChart,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Lead pipeline",
    body: "Track every lead from new to won with statuses, notes, and source attribution.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Hammer,
    title: "Job tracking",
    body: "Schedule jobs, set prices, and update status from quote to completion.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Sparkles,
    title: "AI follow-ups",
    body: "Generate friendly follow-up texts and full proposals in seconds.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: CalendarClock,
    title: "Reminders",
    body: "Never forget a callback. Daily list of follow-ups due today.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: LineChart,
    title: "Real dashboard",
    body: "See total leads, active jobs, revenue, and pipeline at a glance.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Wallet,
    title: "Marketplace credits",
    body: "Pay-per-lead pricing with wallet credit. Refunds for bad leads.",
    color: "from-amber-500 to-orange-500",
  },
];

const metrics = [
  { value: "500+", label: "fresh leads pulled daily" },
  { value: "12", label: "automated lead sources" },
  { value: "30s", label: "to send an AI follow-up" },
  { value: "$0", label: "card required to start" },
];

const sources = [
  "Reddit", "Craigslist", "NOAA Storms", "Boston Permits",
  "NYC Permits", "Chicago Permits", "MA Registry", "Public Bids",
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background art */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-1" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-grid" />
      <div className="pointer-events-none absolute -z-10 left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-brand-radial blur-3xl" />

      {/* Nav */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pros" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden sm:inline rounded-lg hover:bg-white/60">
            Find a pro
          </Link>
          <Link href="/find-pro" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden sm:inline rounded-lg hover:bg-white/60">
            For homeowners
          </Link>
          <Link href="/download" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden sm:inline rounded-lg hover:bg-white/60">
            Download
          </Link>
          <Link href="/login" className="btn-secondary">Log in</Link>
          <Link href="/signup" className="btn-primary">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center animate-fade-up">
        <span className="badge bg-white/80 text-brand-700 ring-brand-200 backdrop-blur shadow-soft">
          <Zap className="h-3.5 w-3.5 mr-1" />
          Powered by Claude AI · 500+ leads/day
        </span>
        <h1 className="mt-6 display-h1 leading-[1.02]">
          The CRM built for{" "}
          <span className="gradient-text">contractors</span>
          <br className="hidden sm:block" />
          <span className="text-ink-700 font-semibold text-4xl sm:text-5xl">
            who close more, faster.
          </span>
        </h1>
        <p className="mt-7 lede max-w-2xl mx-auto">
          Leads, jobs, customers, and follow-ups in one place — plus an
          AI assistant that drafts your proposals and texts while you sleep.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base px-7 py-3.5">
            Start 14-day free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-7 py-3.5">
            I already have an account
          </Link>
        </div>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
          {["No credit card", "14-day free trial", "Cancel anytime"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>

        {/* Social proof strip */}
        <div className="mt-14 mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="card p-4 text-center">
                <div className="text-2xl font-bold gradient-text">{m.value}</div>
                <div className="mt-1 text-xs text-ink-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mock dashboard preview */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative rounded-3xl border border-ink-200/70 bg-white/90 backdrop-blur shadow-soft-lg overflow-hidden animate-fade-up">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-200/70 bg-ink-50/80">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-ink-500">contractorflow.com/dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total leads",   value: "47",      tone: "from-indigo-500 to-violet-500" },
              { label: "Active jobs",   value: "12",      tone: "from-violet-500 to-fuchsia-500" },
              { label: "Revenue",       value: "$48,200", tone: "from-emerald-500 to-teal-500" },
              { label: "Due today",     value: "3",       tone: "from-amber-500 to-orange-500" },
            ].map((s) => (
              <div key={s.label} className={`stat-tile bg-gradient-to-br ${s.tone}`}>
                <div className="relative z-10 text-xs uppercase tracking-wider opacity-90">{s.label}</div>
                <div className="relative z-10 mt-1 text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 grid sm:grid-cols-5 gap-3">
            {[
              { name: "John D.",   svc: "Roof repair",       tag: "New",            tone: "bg-ink-100 text-ink-700" },
              { name: "Maria S.",  svc: "Bathroom remodel",  tag: "Estimate Sent",  tone: "bg-amber-100 text-amber-700" },
              { name: "Chen K.",   svc: "Deck build",        tag: "Won",            tone: "bg-emerald-100 text-emerald-700" },
              { name: "Priya R.",  svc: "Fence install",     tag: "Contacted",      tone: "bg-blue-100 text-blue-700" },
              { name: "Sam T.",    svc: "Driveway",          tag: "New",            tone: "bg-ink-100 text-ink-700" },
            ].map((l) => (
              <div key={l.name} className="rounded-xl border border-ink-200 bg-white p-3 shadow-soft">
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-xs text-ink-500 truncate">{l.svc}</div>
                <span className={`mt-2 badge ${l.tone} ring-transparent`}>{l.tag}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </section>

      {/* Lead sources */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="surface-soft p-8 sm:p-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Lead engine</span>
              <h2 className="mt-3 display-h2">
                500+ fresh leads pulled in every day.
              </h2>
              <p className="mt-3 lede">
                We monitor public records, classifieds, storm alerts, and 12+ other
                sources around the clock — so your pipeline is never empty.
              </p>
              <Link href="/opportunities" className="btn-primary mt-6">
                See live sources <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <span key={s} className="badge bg-white text-ink-700 ring-ink-200 shadow-soft px-3 py-1.5 text-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-eyebrow">Everything you need</span>
          <h2 className="mt-3 display-h2">
            Built for small crews, not enterprise.
          </h2>
          <p className="mt-3 lede">
            One-person shops, two-truck teams, and growing crews — all the
            essentials, none of the bloat.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="card card-hover p-6 group">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-glow`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial / trust */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="card p-8 sm:p-10">
          <div className="flex items-center gap-1 text-amber-500">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
          </div>
          <blockquote className="mt-4 text-xl sm:text-2xl font-medium tracking-tight text-ink-800 leading-snug">
            &ldquo;ContractorFlow paid for itself in the first week. The AI follow-ups
            alone closed two jobs that I would&apos;ve forgotten to call back.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand-gradient" />
            <div>
              <div className="text-sm font-semibold">Marco R.</div>
              <div className="text-xs text-ink-500">Owner, Reliable Roofing · Worcester, MA</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verified customer
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 sm:p-14 text-center text-white shadow-glow">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to ditch the spreadsheet?</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto text-base sm:text-lg">
            Set up your first lead in under a minute. AI follow-ups included.
          </p>
          <Link href="/signup"
            className="btn mt-8 bg-white text-brand-700 hover:bg-ink-50 text-base px-7 py-3.5 inline-flex">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" />
          <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" />
        </div>
      </section>

      <footer className="border-t border-ink-200 py-8 text-center text-sm text-ink-500">
        © {new Date().getFullYear()} ContractorFlow · Built with Next.js + Claude
      </footer>
    </main>
  );
}
