import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { FindProForm } from "./FindProForm";

export const dynamic = "force-dynamic";

export default function FindProPage() {
  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <Link href="/login" className="btn-secondary">Contractor login</Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
            Free homeowner service
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Get matched with{" "}
            <span className="gradient-text">vetted contractors</span> near you
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Tell us about your project and we'll connect you with up to three
            local pros within 24 hours. Free, no obligation, no pressure.
          </p>
          <ul className="mt-7 space-y-2.5 text-sm text-slate-700">
            {[
              "Multiple quotes, one form",
              "Pros are background-checked and licensed",
              "Used by thousands of homeowners",
              "100% free — we're paid by the pros, not you",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-7 inline-flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Your info is shared only with pros you're matched with.
          </div>
        </div>

        <div className="card p-6 sm:p-7">
          <h2 className="text-xl font-bold">Start your free quote</h2>
          <p className="text-sm text-slate-500 mt-1">Takes about 60 seconds.</p>
          <FindProForm />
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 mt-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow Marketplace
      </footer>
    </main>
  );
}
