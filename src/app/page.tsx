import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hammer,
  LineChart,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Lead pipeline",
    body: "Track every lead from new to won with statuses, notes, and source tracking.",
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
    title: "Simple billing",
    body: "Stripe-powered subscription. 14-day free trial, cancel any time.",
    color: "from-amber-500 to-orange-500",
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Background art */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-grid" />
      <div className="pointer-events-none absolute -z-10 left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-brand-radial blur-3xl" />

      {/* Nav */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">Log in</Link>
          <Link href="/signup" className="btn-primary">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 text-center animate-fade-up">
        <span className="badge bg-white/70 text-brand-700 ring-brand-200 backdrop-blur">
          <Zap className="h-3.5 w-3.5 mr-1" />
          Powered by Claude AI
        </span>
        <h1 className="mt-5 text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
          The CRM built for{" "}
          <span className="gradient-text">contractors</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Keep leads, jobs, customers, and follow-ups in one place — and let AI
          write your proposals and follow-up texts in seconds.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Start 14-day free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">
            I already have an account
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          {["No credit card", "14-day free trial", "Cancel anytime"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Mock dashboard preview */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-2xl shadow-indigo-500/10 overflow-hidden animate-fade-up">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-200/70 bg-slate-50/80">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-slate-500">contractorflow.com/dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total leads",   value: "47",     tone: "from-indigo-500 to-violet-500" },
              { label: "Active jobs",   value: "12",     tone: "from-violet-500 to-fuchsia-500" },
              { label: "Revenue",       value: "$48,200", tone: "from-emerald-500 to-teal-500" },
              { label: "Due today",     value: "3",      tone: "from-amber-500 to-orange-500" },
            ].map((s) => (
              <div key={s.label} className={`stat-tile bg-gradient-to-br ${s.tone}`}>
                <div className="text-xs uppercase tracking-wider opacity-90">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 grid sm:grid-cols-5 gap-3">
            {[
              { name: "John D.",   svc: "Roof repair",       tag: "New",            tone: "bg-slate-100 text-slate-700" },
              { name: "Maria S.",  svc: "Bathroom remodel",  tag: "Estimate Sent",  tone: "bg-amber-100 text-amber-700" },
              { name: "Chen K.",   svc: "Deck build",        tag: "Won",            tone: "bg-emerald-100 text-emerald-700" },
              { name: "Priya R.",  svc: "Fence install",     tag: "Contacted",      tone: "bg-blue-100 text-blue-700" },
              { name: "Sam T.",    svc: "Driveway",          tag: "New",            tone: "bg-slate-100 text-slate-700" },
            ].map((l) => (
              <div key={l.name} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-xs text-slate-500 truncate">{l.svc}</div>
                <span className={`mt-2 badge ${l.tone} ring-transparent`}>{l.tag}</span>
              </div>
            ))}
          </div>
          {/* shimmer accent */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything a small crew needs
          </h2>
          <p className="mt-3 text-slate-600">
            Built for one-person shops and small teams. No bloated enterprise menus.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="card card-hover p-6 group">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-glow`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 sm:p-14 text-center text-white shadow-glow">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to ditch the spreadsheet?</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">
            Set up your first lead in under a minute. AI follow-ups included.
          </p>
          <Link href="/signup"
            className="btn mt-7 bg-white text-brand-700 hover:bg-slate-50 text-base px-6 py-3 inline-flex">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow · Built with Next.js + Claude
      </footer>
    </main>
  );
}
