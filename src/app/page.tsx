import Link from "next/link";
import { CheckCircle2, FileText, Sparkles, Hammer, ShieldCheck, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Hammer size={18} />
          </span>
          ProposalPro <span className="text-brand-600">AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles size={14} /> AI proposals built for contractors
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
          Win more jobs with proposals
          <br />
          <span className="text-brand-600">that close themselves.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Snap a few photos, jot down the scope, and ProposalPro AI turns it into a polished,
          itemized, client-ready proposal — complete with pricing, payment schedule, and PDF export.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start free trial</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">See a sample</Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">No credit card required · 14-day Pro trial</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-8 rounded-2xl bg-gray-900 p-10 text-white sm:grid-cols-2 sm:p-14">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Stop writing proposals at midnight.</h2>
            <p className="mt-3 text-gray-300">
              Contractors using ProposalPro AI ship proposals 8x faster and close more jobs at higher margin.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-brand-400" size={18} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} ProposalPro AI</span>
          <span>Built for contractors, roofers, remodelers, landscapers & trades.</span>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: Sparkles, title: "AI-written proposal copy", body: "Drop in scope, materials, and notes — Claude or GPT writes a clean, professional narrative." },
  { icon: FileText, title: "Itemized pricing tables", body: "Auto-calculated line items with markup, tax, and totals. Edit any row inline." },
  { icon: ShieldCheck, title: "Payment schedule & terms", body: "Built-in deposit, milestones, and customizable terms-and-conditions." },
  { icon: Hammer, title: "Photo-driven projects", body: "Upload site photos straight from your phone — they live with the proposal." },
  { icon: Smartphone, title: "Mobile-first", body: "Build a proposal from a job site in under 10 minutes on your phone." },
  { icon: CheckCircle2, title: "PDF in one click", body: "Export a branded, signature-ready PDF you can email or text instantly." },
];

const bullets = [
  "Generate a proposal in under 10 minutes",
  "Save every job in a searchable dashboard",
  "Send a polished PDF before your competitor follows up",
  "Lock in deposits with a clear payment schedule",
  "Look like a $5M company on day one",
];
