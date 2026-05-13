import Link from "next/link";
import { Calculator, Sparkles } from "lucide-react";
import { EstimateForm } from "./EstimateForm";

// Plan 1 / Section E / Idea #18 — Quick estimate calculator.
//
// Public widget — embeddable + standalone — that lets a homeowner get a
// ballpark in 30 seconds for common services. Submits to a marketplace
// intake endpoint, surfacing the lead to a contractor in the area.

export const dynamic = "force-static";

export default function PublicEstimatePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white py-12 px-4">
      <div className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 600px at 50% -10%, rgba(99,102,241,0.30), transparent 60%), radial-gradient(700px 500px at 90% 50%, rgba(6,182,212,0.15), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
        }}
      />

      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8 animate-fade-up">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow text-xs font-bold">CF</span>
            ContractorFlow
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 ring-1 ring-white/15 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> 30-second quote
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              Get a ballpark price in 30 seconds
            </span>
          </h1>
          <p className="mt-3 text-white/65 max-w-xl mx-auto">
            Pick your project · answer 3 quick questions · we&apos;ll surface real local pricing
            and connect you with a verified contractor if you want a real quote.
          </p>
        </header>

        <section className="rounded-2xl ring-1 ring-white/10 bg-white/[0.04] backdrop-blur p-6 sm:p-8 animate-fade-up">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-brand-300 mb-5">
            <Calculator className="h-3.5 w-3.5" /> Estimate calculator
          </div>
          <EstimateForm />
        </section>

        <p className="text-center text-xs text-white/40 mt-6">
          Estimates are ballparks based on regional averages. Final price varies based on scope,
          materials, and site conditions.
        </p>
      </div>
    </main>
  );
}
