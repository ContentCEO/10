import Link from "next/link";
import type { Metadata } from "next";
import { Calculator, Sparkles } from "lucide-react";
import { CostCalculatorForm } from "./CostCalculatorForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project cost calculator | ContractorFlow",
  description:
    "Free instant cost calculator for home renovations. Kitchen, bathroom, deck, roof, and more. Powered by AI — get a ballpark range in 30 seconds.",
  alternates: { canonical: "/cost-calculator" },
};

export default function CostCalculatorPage() {
  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <Link href="/find-pro" className="btn-primary">Get a real quote</Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
          <Sparkles className="h-3 w-3 mr-1" /> Free · AI-powered
        </span>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Project <span className="gradient-text">cost calculator</span>
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Pick a project, tell us a few details, get an instant ballpark range from Claude.
          Real prices vary by location and conditions — use this to set expectations
          before getting real quotes.
        </p>

        <div className="mt-8">
          <CostCalculatorForm />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-600" /> Common projects we estimate
        </h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
          {[
            "Kitchen remodel", "Bathroom remodel", "Roof replacement",
            "Siding replacement", "Deck build", "Fence install",
            "Hardwood flooring", "Interior painting", "Driveway",
            "Basement finishing", "Window replacement", "HVAC install",
          ].map((s) => (
            <Link key={s} href={`/local/${s.toLowerCase().replace(/\s+/g, "-")}/boston`}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 px-3 py-2">
              {s} →
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
