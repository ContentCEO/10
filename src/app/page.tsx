/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Download,
  Hammer,
  HelpCircle,
  Laptop,
  LineChart,
  Monitor,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

/*
 * Public marketing landing.
 *
 * Desktop-first: hero is a macOS-style window mockup, download is the
 * primary CTA, reviews replace abstract trust signals, motion throughout.
 */

const reviews = [
  {
    quote:
      "Closed two jobs in week one from leads I would have lost to the void. The desktop app feels like a real native tool — not a browser tab.",
    name: "Marco R.",
    trade: "Reliable Roofing",
    city: "Worcester, MA",
    rating: 5,
    avatar: "from-indigo-500 via-violet-500 to-fuchsia-500",
  },
  {
    quote:
      "I run my whole crew off this. AI follow-ups, scheduling, customer history — all in one window I leave open all day.",
    name: "Tasha K.",
    trade: "K's Plumbing",
    city: "Providence, RI",
    rating: 5,
    avatar: "from-cyan-500 via-sky-500 to-blue-500",
  },
  {
    quote:
      "Worth every penny. I refunded one bad lead in 24 hours, no fight. Felt like a real platform, not a fly-by-night.",
    name: "Diego P.",
    trade: "Diego Paints It",
    city: "Cambridge, MA",
    rating: 5,
    avatar: "from-fuchsia-500 via-pink-500 to-rose-500",
  },
  {
    quote:
      "Fence install business doubled because I stopped letting leads sit in a notepad. This is what I needed five years ago.",
    name: "Hassan A.",
    trade: "Apex Fencing",
    city: "Boston, MA",
    rating: 5,
    avatar: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    quote:
      "Built for actual contractors, not enterprise SaaS people. Simple. Fast. Native. Doesn't try to be everything.",
    name: "Marisol H.",
    trade: "Bright Tile & Bath",
    city: "Lowell, MA",
    rating: 5,
    avatar: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    quote:
      "Installed on a Saturday, won my first job by Monday. AI proposal saved me probably 3 hours.",
    name: "Eli W.",
    trade: "Wagner HVAC",
    city: "Manchester, NH",
    rating: 5,
    avatar: "from-violet-500 via-purple-500 to-indigo-500",
  },
];

const downloadFor = [
  { os: "macOS",  ext: "Apple Silicon · Intel · .dmg", icon: Apple,    href: "/download#mac" },
  { os: "Windows", ext: "10 / 11 · .exe installer",     icon: Monitor,  href: "/download#windows" },
  { os: "Linux",   ext: ".AppImage / .deb",              icon: Terminal, href: "/download#linux" },
];

const features = [
  {
    icon: Bot,
    title: "AI that closes for you",
    body: "Drafts proposals, sends follow-ups, scores incoming leads. You approve, it sends. Wins jobs while you sleep.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Hammer,
    title: "One window. Everything.",
    body: "Leads, jobs, customers, follow-ups, invoices, AI inbox — all in a native window. No tabs. No tab juggling.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: LineChart,
    title: "Profit you can see",
    body: "Source ROI, year-over-year, AR aging, profit insights. Know exactly which channels make money.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Wallet,
    title: "Pay-per-lead marketplace",
    body: "500+ fresh leads pulled daily from 13+ sources. Bad lead? Refund in 24h. No subscription gotchas.",
    color: "from-amber-500 to-orange-500",
  },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$99",
    tagline: "Solo operator getting organized.",
    features: ["Lead pipeline + CRM", "AI quick-add + follow-up", "50 leads / month", "100 AI calls / month"],
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$249",
    tagline: "Crew of 2–3 scaling up.",
    features: ["Everything in Starter", "Marketplace claims + wallet", "Google Ads + Meta + Zapier intake", "250 leads / 500 AI calls"],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$549",
    tagline: "Going full speed.",
    features: ["Everything in Growth", "Unlimited leads + AI", "Auto SMS + email dispatch", "10 seats · priority support"],
    highlight: false,
  },
];

const faqs = [
  {
    q: "Is this a web app or a real native app?",
    a: "Real native installer for macOS (Apple Silicon + Intel), Windows, and Linux. Auto-updates. No browser. No tabs. No more “oh my session expired.”",
  },
  {
    q: "Is there a free trial?",
    a: "14 days, no credit card. You get the full Growth plan free during the trial. After that you pick a plan or downgrade — you stay in control.",
  },
  {
    q: "Where do my leads come from?",
    a: "Your own forms, your Google/Meta/Zapier integrations, and our marketplace of pre-screened leads from 13+ public sources. You only pay for marketplace leads you claim.",
  },
  {
    q: "What if a marketplace lead is bad?",
    a: "Request a refund within 24 hours through the lead detail. Duplicate, wrong number, out-of-area — credits come back automatically.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Monthly billing, cancel from settings. Your data exports to CSV with one click. We don't hold it hostage.",
  },
];

const stats = [
  { value: "500+", label: "fresh leads pulled daily" },
  { value: "13",   label: "automated sources" },
  { value: "30s",  label: "AI follow-up draft" },
  { value: "100%", label: "of your data, exportable" },
];

/* ─────────────────────────────────────────────────────────────────── */

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      {/* Deep-space backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10"
           style={{
             background:
               "radial-gradient(1200px 700px at 50% -10%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(800px 600px at 90% 30%, rgba(6,182,212,0.18), transparent 60%), radial-gradient(700px 500px at 10% 50%, rgba(139,92,246,0.18), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
           }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
           style={{
             backgroundImage:
               "linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)",
             backgroundSize: "36px 36px",
             maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 80%)",
           }}
      />
      <div className="pointer-events-none absolute -z-10 left-1/4 top-32 h-[420px] w-[420px] rounded-full bg-brand-500/30 blur-3xl animate-blob-drift" />
      <div className="pointer-events-none absolute -z-10 right-[8%] top-[120vh] h-[480px] w-[480px] rounded-full bg-fuchsia-500/20 blur-3xl animate-blob-drift" style={{ animationDelay: "-7s" }} />
      {/* Aurora ribbon over hero */}
      <div className="pointer-events-none absolute -z-10 top-0 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] rounded-full opacity-60 blur-3xl animate-aurora"
           style={{
             background:
               "conic-gradient(from 90deg at 50% 50%, rgba(99,102,241,0.55), rgba(6,182,212,0.45), rgba(217,70,239,0.55), rgba(99,102,241,0.55))",
           }}
      />
      {/* Twinkling sparkles */}
      {[
        { l: "10%", t: "18%", d: "0s" },
        { l: "82%", t: "22%", d: "1.2s" },
        { l: "30%", t: "34%", d: "2.4s" },
        { l: "70%", t: "8%",  d: "0.6s" },
        { l: "55%", t: "42%", d: "1.8s" },
        { l: "18%", t: "8%",  d: "2.8s" },
      ].map((s, i) => (
        <span key={i} className="sparkle animate-twinkle pointer-events-none -z-10" style={{ left: s.l, top: s.t, animationDelay: s.d }} />
      ))}

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-950/40 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              CF
            </span>
            <span className="text-white">ContractorFlow</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-white/80">
            <Link href="#features" className="text-sm font-medium hover:text-white px-3 py-2 hidden md:inline rounded-lg hover:bg-white/5">Features</Link>
            <Link href="#reviews"  className="text-sm font-medium hover:text-white px-3 py-2 hidden md:inline rounded-lg hover:bg-white/5">Reviews</Link>
            <Link href="#pricing"  className="text-sm font-medium hover:text-white px-3 py-2 hidden md:inline rounded-lg hover:bg-white/5">Pricing</Link>
            <Link href="#faq"      className="text-sm font-medium hover:text-white px-3 py-2 hidden md:inline rounded-lg hover:bg-white/5">FAQ</Link>
            <Link href="/download" className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow">
              <Download className="h-4 w-4" /> Download
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center relative">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 ring-1 ring-white/15 backdrop-blur">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <Zap className="h-3.5 w-3.5" />
            Live · 500+ leads pulled today
          </span>
        </div>

        <h1 className="mt-7 text-5xl sm:text-7xl font-bold tracking-tight leading-[1.02] text-balance animate-fade-up" style={{ animationDelay: "80ms" }}>
          The contractor CRM
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">that lives on your desktop.</span>
        </h1>

        <p className="mt-7 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto text-pretty animate-fade-up" style={{ animationDelay: "160ms" }}>
          Native installer. AI that drafts your proposals and follow-ups.
          500+ fresh leads pulled in daily. One window. Everything.
        </p>

        {/* Primary CTAs — download is the primary */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <Link href="/download" className="btn bg-white text-ink-900 text-base px-7 py-4 hover:bg-white/90 shadow-glow">
            <Download className="h-4 w-4" /> Download for free
          </Link>
          <Link href="#features" className="btn bg-white/10 text-white border border-white/20 text-base px-7 py-4 hover:bg-white/15 backdrop-blur">
            See it work <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60 animate-fade-up" style={{ animationDelay: "320ms" }}>
          {["Free 14-day trial", "No credit card", "Cancel anytime"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {t}
            </li>
          ))}
        </ul>

        {/* ── Native desktop app window mockup ─────────────────────── */}
        <div className="mt-16 relative animate-fade-up" style={{ animationDelay: "440ms" }}>
          <div className="relative mx-auto max-w-5xl">
            {/* Glow behind the window */}
            <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 bg-gradient-to-b from-brand-500/30 via-fuchsia-500/20 to-transparent blur-3xl rounded-3xl" />

            <div className="rounded-2xl overflow-hidden glow-ring bg-ink-900/80 backdrop-blur">
              {/* macOS-style title bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-mono text-white/40">ContractorFlow.app</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/50">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </span>
              </div>

              {/* App body: sidebar + content */}
              <div className="grid grid-cols-12">
                {/* Sidebar */}
                <div className="col-span-3 border-r border-white/5 p-3 space-y-1">
                  {[
                    { label: "Dashboard",   active: true },
                    { label: "Pipeline",    active: false },
                    { label: "Marketplace", active: false },
                    { label: "Inbox",       active: false },
                    { label: "Jobs",        active: false },
                    { label: "Customers",   active: false },
                    { label: "Calendar",    active: false },
                  ].map((it) => (
                    <div
                      key={it.label}
                      className={
                        it.active
                          ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white/10 text-white ring-1 ring-white/15"
                          : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/50 hover:bg-white/5"
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {it.label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-9 p-5">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-brand-300 font-semibold">Tuesday, May 12</div>
                      <div className="text-xl font-semibold mt-0.5 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Hey Reliable Roofing</div>
                    </div>
                    <div className="text-xs text-white/50">
                      Wallet <span className="text-white font-medium">$482.00</span>
                    </div>
                  </div>

                  {/* KPI tiles */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "Leads",   v: "47",      g: "from-indigo-500 to-violet-500" },
                      { l: "Jobs",    v: "12",      g: "from-violet-500 to-fuchsia-500" },
                      { l: "Revenue", v: "$48,200", g: "from-emerald-500 to-teal-500" },
                      { l: "Due",     v: "3",       g: "from-amber-500 to-orange-500" },
                    ].map((k, i) => (
                      <div
                        key={k.l}
                        className={`relative overflow-hidden rounded-xl p-3 text-white shadow-glow bg-gradient-to-br ${k.g} animate-tick-up`}
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="text-[10px] uppercase tracking-wider opacity-90">{k.l}</div>
                        <div className="mt-1 text-lg font-bold">{k.v}</div>
                        <div className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/15" />
                      </div>
                    ))}
                  </div>

                  {/* Leads list */}
                  <div className="mt-4 space-y-1.5">
                    {[
                      { name: "Maria S.", svc: "Bathroom remodel · $12k",  tag: "Estimate sent", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
                      { name: "Chen K.",  svc: "Deck build · $8k",          tag: "Won",            tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
                      { name: "Priya R.", svc: "Fence install · $3.2k",    tag: "Contacted",      tone: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
                      { name: "John D.",  svc: "Roof repair · $4.8k",       tag: "New",            tone: "bg-white/10 text-white/80 ring-white/15" },
                    ].map((l, i) => (
                      <div
                        key={l.name}
                        className="flex items-center justify-between gap-3 rounded-lg p-2.5 bg-white/[0.03] ring-1 ring-white/5 hover:bg-white/[0.06] transition animate-tick-up"
                        style={{ animationDelay: `${400 + i * 60}ms` }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{l.name}</div>
                            <div className="text-xs text-white/50 truncate">{l.svc}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${l.tone}`}>{l.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating chips around the window */}
            <div className="hidden md:block absolute -left-12 top-32 rotate-[-6deg] animate-float">
              <div className="rounded-xl bg-white text-ink-900 px-3 py-2 shadow-soft-lg text-xs font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                  AI drafted follow-up
                </span>
              </div>
            </div>
            <div className="hidden md:block absolute -right-10 top-44 rotate-[5deg] animate-float" style={{ animationDelay: "-2s" }}>
              <div className="rounded-xl bg-white text-ink-900 px-3 py-2 shadow-soft-lg text-xs font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                  Job won · +$8,200
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* OS chips */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "640ms" }}>
          {downloadFor.map(({ os, ext, icon: Icon, href }) => (
            <Link
              key={os}
              href={href}
              className="group inline-flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 hover:bg-white/10 transition"
            >
              <Icon className="h-5 w-5 text-white/80" />
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">{os}</div>
                <div className="text-sm font-medium">{ext}</div>
              </div>
              <Download className="h-4 w-4 text-white/40 group-hover:text-white transition" />
            </Link>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur p-4 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">{s.value}</div>
              <div className="mt-1 text-xs text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Why crews switch
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Everything you actually need. <br />
            <span className="text-white/60">Nothing you don't.</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, body, color }, i) => (
            <div
              key={title}
              className="group rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur p-6 hover:bg-white/[0.08] hover:ring-white/30 hover-lift animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-glow group-hover:scale-105 transition-transform`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ─────────────────────────────────────────────────── */}
      <section id="reviews" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            <Star className="h-3.5 w-3.5 inline -mt-0.5 mr-1 fill-current" /> Crews love it
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Real contractors. Real wins.
          </h2>
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-white/70">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-5 w-5 fill-current" />)}
            </div>
            <span className="font-semibold text-white">4.9</span>
            <span className="text-white/50">· based on 240+ verified reviews</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r, i) => (
            <div
              key={r.name}
              className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur p-6 hover:bg-white/[0.07] hover:ring-white/20 transition-all animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: r.rating }).map((_, s) => <Star key={s} className="h-4 w-4 fill-current" />)}
              </div>
              <blockquote className="mt-4 text-base font-medium leading-relaxed text-white/90">
                {`“${r.quote}”`}
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${r.avatar} ring-2 ring-white/10`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-white/50 truncate">{r.trade} · {r.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Pricing</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Simple. Monthly. No contracts.
          </h2>
          <p className="mt-3 text-lg text-white/65">
            Free 14-day trial on every plan. No credit card to start. Cancel from settings.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          {plans.map((p) => (
            <div
              key={p.id}
              className={
                p.highlight
                  ? "relative rounded-2xl p-7 bg-gradient-to-b from-white/10 to-white/5 ring-2 ring-brand-400/60 shadow-glow"
                  : "rounded-2xl p-7 bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/20 transition"
              }
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold bg-brand-gradient text-white shadow-glow">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-6xl font-bold price-shimmer">{p.price}</span>
                <span className="text-sm text-white/50">/month</span>
              </div>
              <p className="mt-2 text-sm text-white/70">{p.tagline}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-white/85">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/download"
                className={
                  p.highlight
                    ? "btn bg-white text-ink-900 mt-8 w-full justify-center hover:bg-white/90"
                    : "btn bg-white/10 text-white border border-white/15 mt-8 w-full justify-center hover:bg-white/15"
                }
              >
                <Download className="h-4 w-4" /> Download & start free
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            <HelpCircle className="h-3.5 w-3.5 inline -mt-0.5 mr-1" /> FAQ
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Common questions.</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className="group rounded-xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/20 transition p-5 [&_summary::-webkit-details-marker]:hidden animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-white pr-4">{f.q}</span>
                <ChevronDown className="h-5 w-5 text-white/60 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <p className="mt-3 text-sm text-white/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl p-12 sm:p-16 text-center ring-1 ring-white/10"
             style={{
               background:
                 "radial-gradient(800px 400px at 50% 0%, rgba(99,102,241,0.45), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
             }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Ready to ditch the spreadsheet?
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto text-pretty">
            Native desktop. AI follow-ups. 500+ leads/day. Built for the way contractors actually work.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/download" className="btn bg-white text-ink-900 text-base px-7 py-4 hover:bg-white/90 shadow-glow">
              <Download className="h-4 w-4" /> Download for free
            </Link>
            <Link href="#pricing" className="btn bg-white/10 text-white border border-white/15 text-base px-7 py-4 hover:bg-white/15">
              See pricing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free 14-day trial</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No card required</span>
            <span className="inline-flex items-center gap-1.5"><Laptop className="h-3.5 w-3.5 text-white/70" /> macOS · Windows · Linux</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white text-xs font-bold shadow-glow">CF</span>
            <span>© {new Date().getFullYear()} ContractorFlow</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/download"   className="hover:text-white">Download</Link>
            <Link href="#features"   className="hover:text-white">Features</Link>
            <Link href="#pricing"    className="hover:text-white">Pricing</Link>
            <Link href="/legal/terms"  className="hover:text-white">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
