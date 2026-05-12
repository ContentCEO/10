import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Hammer,
  HelpCircle,
  LineChart,
  MessageSquareText,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────── */
/* Static landing data — server-rendered for SEO + fast first paint        */
/* ────────────────────────────────────────────────────────────────────── */

const features = [
  {
    icon: ClipboardList,
    title: "Lead pipeline",
    body: "Every lead from new to won. Statuses, notes, files, AI follow-up suggestions.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Hammer,
    title: "Job tracking",
    body: "Schedule, price, and update jobs from quote to completion — all on one screen.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Sparkles,
    title: "AI proposals & follow-ups",
    body: "Generate quotes, friendly check-ins, and full proposals in 30 seconds. In your voice.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: CalendarClock,
    title: "Smart reminders",
    body: "Every callback, every follow-up, every estimate. Daily list. No more falling through cracks.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: LineChart,
    title: "Profit dashboard",
    body: "Revenue, pipeline value, conversion rate, source ROI, year-over-year — at a glance.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Wallet,
    title: "Marketplace credits",
    body: "Pay-per-lead pricing with a wallet. Bad lead? Refund within 24h, no questions.",
    color: "from-amber-500 to-orange-500",
  },
];

const heroMetrics = [
  { value: "500+",  label: "fresh leads pulled daily" },
  { value: "13",    label: "automated sources" },
  { value: "30s",   label: "to send AI follow-up" },
  { value: "$0",    label: "card required to start" },
];

const sources = [
  { name: "Reddit",         tone: "bg-orange-100 text-orange-700 ring-orange-200" },
  { name: "Craigslist",     tone: "bg-violet-100 text-violet-700 ring-violet-200" },
  { name: "NOAA Storms",    tone: "bg-sky-100 text-sky-700 ring-sky-200" },
  { name: "Boston Permits", tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  { name: "NYC Permits",    tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  { name: "Chicago Permits",tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  { name: "MA Registry",    tone: "bg-amber-100 text-amber-700 ring-amber-200" },
  { name: "SAM.gov",        tone: "bg-rose-100 text-rose-700 ring-rose-200" },
  { name: "State RFPs",     tone: "bg-rose-100 text-rose-700 ring-rose-200" },
  { name: "Yelp",           tone: "bg-red-100 text-red-700 ring-red-200" },
  { name: "Public Bids",    tone: "bg-amber-100 text-amber-700 ring-amber-200" },
  { name: "RSS Feeds",      tone: "bg-cyan-100 text-cyan-700 ring-cyan-200" },
  { name: "Deeds",          tone: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
];

const integrations = [
  "Stripe", "Twilio", "SendGrid", "Google Ads", "Meta Ads",
  "Zapier", "QuickBooks", "Slack", "Make", "Supabase",
];

const howSteps = [
  {
    n: "01",
    icon: Download,
    title: "Sign up & install",
    body: "Free 14-day trial, no card. Use the web app or install the desktop app for macOS, Windows, or Linux.",
  },
  {
    n: "02",
    icon: Bot,
    title: "Connect your lead sources",
    body: "Plug in Google Ads, Meta, Zapier, your own forms — or just pull from the marketplace. Leads flow in within minutes.",
  },
  {
    n: "03",
    icon: Trophy,
    title: "Close more, faster",
    body: "AI drafts your follow-ups, schedules your callbacks, and shows you who to call next. Win rate goes up. Promise.",
  },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    tagline: "Solo operator getting organized.",
    features: [
      "Lead pipeline + CRM",
      "AI quick-add + AI follow-up",
      "50 active leads / month",
      "100 AI generations / month",
      "1 public capture form",
    ],
    cta: "Start free",
    ctaClass: "btn-secondary",
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$79",
    tagline: "2–3 person crew scaling up.",
    features: [
      "Everything in Starter",
      "Marketplace claims with wallet",
      "Google Ads + Meta + Zapier intake",
      "Recurring service engine",
      "Public profile in /pros directory",
      "250 leads / 500 AI calls per month",
    ],
    cta: "Start free",
    ctaClass: "btn-primary",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$149",
    tagline: "Growing crew going full-speed.",
    features: [
      "Everything in Growth",
      "Unlimited leads + AI generations",
      "Auto SMS + email dispatch",
      "Year-over-year + profit dashboards",
      "10 team seats",
      "Priority email support",
    ],
    cta: "Start free",
    ctaClass: "btn-secondary",
    highlight: false,
  },
];

const testimonials = [
  {
    quote:
      "ContractorFlow paid for itself in the first week. The AI follow-ups alone closed two jobs I would've forgotten to call back.",
    name: "Marco R.",
    role: "Owner · Reliable Roofing",
    city: "Worcester, MA",
    tone: "from-indigo-500 to-violet-500",
  },
  {
    quote:
      "I used to lose half my leads in a spreadsheet. Now everything is in one pipeline and I know exactly who to call next.",
    name: "Tasha K.",
    role: "Lead Tech · K's Plumbing",
    city: "Providence, RI",
    tone: "from-cyan-500 to-blue-500",
  },
  {
    quote:
      "The marketplace leads are unreal. I refunded one bad lead in 24 hours and got my credits back. Felt like a real platform.",
    name: "Diego P.",
    role: "Owner · Diego Paints It",
    city: "Cambridge, MA",
    tone: "from-fuchsia-500 to-pink-500",
  },
];

const faqs = [
  {
    q: "Is there really a free trial?",
    a: "Yes — 14 days, no credit card. You get the full Growth plan free during the trial. After that you pick a plan or downgrade.",
  },
  {
    q: "How do leads actually get to me?",
    a: "Three ways: (1) your own forms / landing pages, (2) integrations with Google Ads, Meta Ads, and Zapier, (3) our marketplace of pre-screened leads from 13+ public sources. You only pay for marketplace leads you claim.",
  },
  {
    q: "What if a marketplace lead is bad?",
    a: "Request a refund within 24 hours through the lead detail page. If it's a duplicate, a wrong number, or out of your service area, you get your credits back automatically.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly billing, cancel from the settings page. Your data exports to CSV with one click — we don't hold it hostage.",
  },
  {
    q: "Do you have a desktop app?",
    a: "Yes — native installers for macOS (Intel + Apple Silicon), Windows, and Linux. Auto-updates included. The web app and desktop app share the same login.",
  },
];

const trustBadges = [
  { icon: ShieldCheck,    text: "Bank-grade encryption" },
  { icon: CreditCard,     text: "Stripe billing" },
  { icon: MessageSquareText, text: "Twilio SMS" },
  { icon: Building2,      text: "US-based support" },
  { icon: Receipt,        text: "Cancel anytime" },
];

/* ────────────────────────────────────────────────────────────────────── */

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background art */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-1" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-grid" />
      <div className="pointer-events-none absolute -z-10 left-1/2 top-0 h-[700px] w-[1200px] -translate-x-1/2 rounded-full bg-brand-radial blur-3xl animate-blob-drift" />
      <div className="pointer-events-none absolute -z-10 right-[-200px] top-[700px] h-[500px] w-[700px] rounded-full bg-accent-400/20 blur-3xl animate-blob-drift" style={{ animationDelay: "-7s" }} />

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/60 border-b border-white/40">
        <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              CF
            </span>
            ContractorFlow
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="#how" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden md:inline rounded-lg hover:bg-white/60">
              How it works
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden md:inline rounded-lg hover:bg-white/60">
              Pricing
            </Link>
            <Link href="/pros" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden lg:inline rounded-lg hover:bg-white/60">
              Find a pro
            </Link>
            <Link href="/download" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-3 py-2 hidden lg:inline rounded-lg hover:bg-white/60">
              Download
            </Link>
            <Link href="/login" className="btn-secondary">Log in</Link>
            <Link href="/signup" className="btn-primary">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
          <span className="badge bg-white/80 text-brand-700 ring-brand-200 backdrop-blur shadow-soft">
            <span className="live-dot mr-2" />
            <Zap className="h-3.5 w-3.5 mr-1" />
            Live · 500+ leads pulled today
          </span>
        </div>

        <h1
          className="mt-7 display-h1 leading-[1.02] text-balance animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          The CRM built for{" "}
          <span className="gradient-text">contractors</span>
          <br className="hidden sm:block" />
          <span className="text-ink-700 font-semibold text-4xl sm:text-5xl">
            who close more, faster.
          </span>
        </h1>

        <p
          className="mt-7 lede max-w-2xl mx-auto text-pretty animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          Leads, jobs, customers, and follow-ups in one place — plus an
          AI assistant that drafts your proposals and texts while you sleep.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <Link href="/signup" className="btn-primary text-base px-7 py-3.5">
            Start 14-day free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/download" className="btn-secondary text-base px-7 py-3.5">
            <Download className="h-4 w-4" /> Download desktop app
          </Link>
        </div>

        <ul
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500 animate-fade-up"
          style={{ animationDelay: "320ms" }}
        >
          {["No credit card", "14-day free trial", "Cancel anytime"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>

        {/* Hero metrics */}
        <div className="mt-14 mx-auto max-w-4xl animate-fade-up" style={{ animationDelay: "400ms" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {heroMetrics.map((m) => (
              <div key={m.label} className="card p-4 text-center">
                <div className="text-2xl font-bold gradient-text">{m.value}</div>
                <div className="mt-1 text-xs text-ink-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration marquee — trust strip */}
      <section className="pb-20 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 mb-6">
            Plays nicely with your existing stack
          </p>
        </div>
        <div className="mask-fade-x overflow-hidden">
          <div className="marquee">
            {[...integrations, ...integrations].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-2 text-ink-600 text-sm font-medium px-4 py-1.5 rounded-xl bg-white/70 border border-ink-200/60 shadow-soft"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {name}
              </span>
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
            <span className="ml-3 text-xs text-ink-500 font-mono">app.contractorflow.com/dashboard</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-500">
              <span className="live-dot" /> Live
            </span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total leads", value: "47",      tone: "from-indigo-500 to-violet-500" },
              { label: "Active jobs", value: "12",      tone: "from-violet-500 to-fuchsia-500" },
              { label: "Revenue MTD", value: "$48,200", tone: "from-emerald-500 to-teal-500" },
              { label: "Due today",   value: "3",       tone: "from-amber-500 to-orange-500" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`stat-tile bg-gradient-to-br ${s.tone} animate-tick-up`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative z-10 text-xs uppercase tracking-wider opacity-90">{s.label}</div>
                <div className="relative z-10 mt-1 text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 grid sm:grid-cols-5 gap-3">
            {[
              { name: "John D.",  svc: "Roof repair",      tag: "New",           tone: "bg-ink-100 text-ink-700" },
              { name: "Maria S.", svc: "Bathroom remodel", tag: "Estimate sent", tone: "bg-amber-100 text-amber-700" },
              { name: "Chen K.",  svc: "Deck build",       tag: "Won",           tone: "bg-emerald-100 text-emerald-700" },
              { name: "Priya R.", svc: "Fence install",    tag: "Contacted",     tone: "bg-blue-100 text-blue-700" },
              { name: "Sam T.",   svc: "Driveway",         tag: "New",           tone: "bg-ink-100 text-ink-700" },
            ].map((l, i) => (
              <div
                key={l.name}
                className="rounded-xl border border-ink-200 bg-white p-3 shadow-soft animate-tick-up"
                style={{ animationDelay: `${400 + i * 80}ms` }}
              >
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
              <h2 className="mt-3 display-h2 text-balance">
                500+ fresh leads pulled in every day.
              </h2>
              <p className="mt-3 lede text-pretty">
                We monitor public records, classifieds, storm alerts, federal procurement, and 13+ other
                sources around the clock — so your pipeline is never empty.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1"><span className="live-dot" /> Boston</span>
                <span className="inline-flex items-center gap-1"><span className="live-dot" /> NYC</span>
                <span className="inline-flex items-center gap-1"><span className="live-dot" /> Chicago</span>
                <span className="inline-flex items-center gap-1"><span className="live-dot" /> 77+ CL regions</span>
              </div>
              <Link href="/opportunities" className="btn-primary mt-6">
                See live sources <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <span
                  key={s.name}
                  className={`badge ${s.tone} ring-inset shadow-soft px-3 py-1.5 text-sm font-medium`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-eyebrow"><Bot className="h-3.5 w-3.5" /> How it works</span>
          <h2 className="mt-3 display-h2 text-balance">
            From signup to first won job — in under a week.
          </h2>
          <p className="mt-3 lede text-pretty">
            No setup calls, no consultants, no 60-page onboarding. Just three steps.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {howSteps.map(({ n, icon: Icon, title, body }, i) => (
            <div
              key={n}
              className="card card-hover p-6 relative animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute -top-3 left-6 font-mono text-xs font-bold text-brand-600 bg-white px-2 py-0.5 rounded-md ring-1 ring-brand-200">
                {n}
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-eyebrow">Everything you need</span>
          <h2 className="mt-3 display-h2 text-balance">
            Built for small crews, not enterprise.
          </h2>
          <p className="mt-3 lede text-pretty">
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

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-eyebrow"><Wallet className="h-3.5 w-3.5" /> Pricing</span>
          <h2 className="mt-3 display-h2 text-balance">
            Simple monthly pricing. No contracts.
          </h2>
          <p className="mt-3 lede text-pretty">
            Start free. Pick a plan when you're ready. Cancel anytime from your settings.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          {plans.map((p) => (
            <div
              key={p.id}
              className={
                p.highlight
                  ? "card relative p-7 ring-2 ring-brand-500 shadow-soft-lg -translate-y-1"
                  : "card card-hover p-7"
              }
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-gradient text-white ring-transparent px-3 py-1 text-xs shadow-glow">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-lg tracking-tight">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-bold gradient-text">{p.price}</span>
                <span className="text-sm text-ink-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-ink-600">{p.tagline}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-ink-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${p.id}`}
                className={`${p.ctaClass} mt-8 w-full justify-center`}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-ink-500">
          Every plan includes a 14-day free trial. No credit card required to start.
        </p>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-eyebrow"><Star className="h-3.5 w-3.5" /> Crews love it</span>
          <h2 className="mt-3 display-h2 text-balance">
            Real contractors. Real wins.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="card card-hover p-6 animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-1 text-amber-500">
                {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-current" />)}
              </div>
              <blockquote className="mt-4 text-base font-medium tracking-tight text-ink-800 leading-snug">
                {`“${t.quote}”`}
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.tone}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{t.name}</div>
                  <div className="text-xs text-ink-500 truncate">{t.role} · {t.city}</div>
                </div>
                <ShieldCheck className="ml-auto h-4 w-4 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-ink-500">
          {trustBadges.map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-brand-600" /> {text}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-eyebrow"><HelpCircle className="h-3.5 w-3.5" /> FAQ</span>
          <h2 className="mt-3 display-h2 text-balance">
            Common questions.
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className="card group p-5 [&_summary::-webkit-details-marker]:hidden animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-ink-900 text-base pr-4">{f.q}</span>
                <span className="shrink-0 h-7 w-7 rounded-full bg-brand-50 text-brand-600 inline-flex items-center justify-center text-sm font-bold transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 sm:p-14 text-center text-white shadow-glow">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            Ready to ditch the spreadsheet?
          </h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto text-base sm:text-lg text-pretty">
            Set up your first lead in under a minute. AI follow-ups included.
            No card. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup"
              className="btn bg-white text-brand-700 hover:bg-ink-50 text-base px-7 py-3.5 inline-flex shadow-soft-lg">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/download"
              className="btn bg-white/15 text-white hover:bg-white/25 text-base px-7 py-3.5 inline-flex border border-white/25 backdrop-blur">
              <Download className="h-4 w-4" /> Download desktop app
            </Link>
          </div>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" />
          <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-float" style={{ animationDelay: "-3s" }} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-200/70 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                CF
              </span>
              ContractorFlow
            </Link>
            <p className="mt-3 text-sm text-ink-600 max-w-xs">
              The AI-powered CRM for contractors and home service businesses.
              Built with Next.js and Claude.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
              <Bell className="h-4 w-4 text-emerald-500" />
              <span className="live-dot" /> All systems operational
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm text-ink-900">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="#how" className="hover:text-ink-900">How it works</Link></li>
              <li><Link href="#pricing" className="hover:text-ink-900">Pricing</Link></li>
              <li><Link href="/download" className="hover:text-ink-900">Download</Link></li>
              <li><Link href="/cost-calculator" className="hover:text-ink-900">Cost calculator</Link></li>
              <li><Link href="/opportunities" className="hover:text-ink-900">Live leads</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-sm text-ink-900">For homeowners</div>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/find-pro" className="hover:text-ink-900">Find a pro</Link></li>
              <li><Link href="/pros" className="hover:text-ink-900">Pro directory</Link></li>
              <li><Link href="/book" className="hover:text-ink-900">Book a service</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-sm text-ink-900">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/login" className="hover:text-ink-900">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-ink-900">Sign up</Link></li>
              <li><Link href="/legal/terms" className="hover:text-ink-900">Terms</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-ink-900">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-ink-200/70">
          <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500">
            <div>© {new Date().getFullYear()} ContractorFlow · Built with Next.js + Claude</div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Encrypted at rest</span>
              <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-brand-600" /> Stripe billing</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
