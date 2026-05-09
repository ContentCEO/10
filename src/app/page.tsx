import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  Hammer,
  LineChart,
  Sparkles,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Lead pipeline",
    body: "Track every lead from new to won with statuses, notes, and source tracking.",
  },
  {
    icon: Hammer,
    title: "Job tracking",
    body: "Schedule jobs, set prices, and update status from quote to completion.",
  },
  {
    icon: Sparkles,
    title: "AI follow-ups",
    body: "Generate friendly follow-up texts and full proposals in seconds.",
  },
  {
    icon: CalendarClock,
    title: "Reminders",
    body: "Never forget a callback. Daily list of follow-ups due today.",
  },
  {
    icon: LineChart,
    title: "Real dashboard",
    body: "See total leads, active jobs, revenue, and pipeline at a glance.",
  },
  {
    icon: Wallet,
    title: "Simple billing",
    body: "Stripe-powered subscription. 14-day free trial, cancel any time.",
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            CF
          </span>
          ContractorFlow
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">Log in</Link>
          <Link href="/signup" className="btn-primary">Start free trial</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <span className="badge bg-brand-50 text-brand-700">AI-powered CRM</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
          The CRM built for contractors
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          ContractorFlow keeps your leads, jobs, customers, and follow-ups in one place —
          and uses AI to write proposals and follow-up messages for you.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary">Start 14-day free trial</Link>
          <Link href="/login" className="btn-secondary">I already have an account</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <Icon className="h-6 w-6 text-brand-600" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow
      </footer>
    </main>
  );
}
