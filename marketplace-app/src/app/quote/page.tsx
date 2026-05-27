import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, Star, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Free contractor quote in Massachusetts | ContractorFlow",
  description: "Pick your project. Get a free, real cost estimate from a licensed Massachusetts contractor — same-week response.",
  alternates: { canonical: "/quote" },
};

const TRADES = [
  { slug: "kitchen-remodel",    label: "Kitchen remodel",   blurb: "Cabinets, counters, gut renos — $18k–$75k" },
  { slug: "bathroom-remodel",   label: "Bathroom remodel",  blurb: "Half baths to master suites — $8k–$35k" },
  { slug: "roofing",            label: "Roof replacement",  blurb: "Shingle, metal, slate — $9k–$28k" },
  { slug: "siding",             label: "Siding",            blurb: "Vinyl, fiber cement, repair — $7k–$25k" },
  { slug: "painting",           label: "Painting",          blurb: "Interior, exterior, prep — $1.5k–$12k" },
  { slug: "flooring",           label: "Flooring",          blurb: "Hardwood, LVP, tile, carpet — $2k–$18k" },
  { slug: "electrical",         label: "Electrical work",   blurb: "Panel, EV charger, rewire — $400–$8k" },
  { slug: "plumbing",           label: "Plumbing",          blurb: "Water heater, drain, repipe — $200–$10k" },
  { slug: "hvac",               label: "HVAC",              blurb: "Install, repair, mini-split — $500–$15k" },
  { slug: "addition",           label: "Home addition",     blurb: "Bedroom to second story — $35k–$200k" },
  { slug: "basement-finish",    label: "Basement finish",   blurb: "Living, bath, in-law — $15k–$60k" },
];

export default function QuoteIndex() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-5xl mx-auto px-6 py-10 sm:py-16">
          <Link href="/" className="text-xs uppercase tracking-[0.18em] text-white/40 hover:text-white/70">
            ← ContractorFlow
          </Link>
          <h1 className="mt-4 font-serif text-4xl sm:text-6xl tracking-tight leading-[1.05]">
            Free <em>contractor quote</em>.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl">
            Pick your project. Answer 3 quick questions. We&apos;ll give you a real cost estimate plus a licensed Massachusetts contractor who can do the job — same week.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><ShieldCheck className="h-3 w-3" /> Licensed + insured</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Star className="h-3 w-3" /> 5-star reviews</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Clock className="h-3 w-3" /> No spam</span>
          </div>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRADES.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/quote/${t.slug}`}
                  className="group block rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 hover:bg-white/[0.06] hover:ring-brand-400/40 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white text-lg">{t.label}</div>
                      <div className="mt-1 text-xs text-white/60">{t.blurb}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-brand-300 transition shrink-0 mt-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
