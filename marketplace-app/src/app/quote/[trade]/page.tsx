import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Star, Clock } from "lucide-react";
import { QuoteWizard } from "./QuoteWizard";

export const dynamic = "force-static";
export const revalidate = 86400;

interface TradeConfig {
  slug: string;
  label: string;
  serviceType: string;
  priceLow: number;
  priceHigh: number;
  unit: string;
  questions: { id: string; label: string; options: string[] }[];
}

const TRADES: Record<string, TradeConfig> = {
  "kitchen-remodel": {
    slug: "kitchen-remodel", label: "Kitchen remodel", serviceType: "Kitchen remodel",
    priceLow: 18_000, priceHigh: 75_000, unit: "project",
    questions: [
      { id: "scope",   label: "What's the scope?", options: ["Just cabinets + counters", "Full gut renovation", "Layout change"] },
      { id: "size",    label: "Kitchen size",       options: ["Small (under 100 sq ft)", "Medium (100–200 sq ft)", "Large (200+ sq ft)"] },
      { id: "finish",  label: "Finish level",       options: ["Standard", "Mid-range", "High-end"] },
    ],
  },
  "bathroom-remodel": {
    slug: "bathroom-remodel", label: "Bathroom remodel", serviceType: "Bathroom remodel",
    priceLow: 8_000, priceHigh: 35_000, unit: "project",
    questions: [
      { id: "scope",   label: "What's the scope?", options: ["Tub/shower only", "Full bath remodel", "Full gut + layout"] },
      { id: "type",    label: "Bath type",          options: ["Half bath", "3/4 bath", "Full bath", "Master bath"] },
      { id: "finish",  label: "Finish level",       options: ["Standard", "Mid-range", "High-end"] },
    ],
  },
  "roofing": {
    slug: "roofing", label: "Roof replacement", serviceType: "Roof replacement",
    priceLow: 9_000, priceHigh: 28_000, unit: "project",
    questions: [
      { id: "size",     label: "Home size",        options: ["Small (under 1500 sq ft)", "Medium (1500–2500)", "Large (2500+)"] },
      { id: "material", label: "Material",         options: ["Asphalt shingles", "Metal", "Slate / tile", "Not sure"] },
      { id: "urgency",  label: "Urgency",          options: ["ASAP — there's a leak", "Within a month", "Within 3 months"] },
    ],
  },
  "siding": {
    slug: "siding", label: "Siding replacement", serviceType: "Siding replacement",
    priceLow: 7_000, priceHigh: 25_000, unit: "project",
    questions: [
      { id: "size",     label: "Home size",   options: ["Small", "Medium", "Large"] },
      { id: "material", label: "Material",    options: ["Vinyl", "Fiber cement", "Wood", "Stucco"] },
      { id: "scope",    label: "Scope",       options: ["Full replacement", "Partial / repair"] },
    ],
  },
  "painting": {
    slug: "painting", label: "Painting", serviceType: "Interior/exterior painting",
    priceLow: 1_500, priceHigh: 12_000, unit: "project",
    questions: [
      { id: "where",   label: "Where?",         options: ["Interior only", "Exterior only", "Both"] },
      { id: "rooms",   label: "How many rooms?", options: ["1–2 rooms", "3–5 rooms", "Whole house"] },
      { id: "prep",    label: "Prep needed?",    options: ["Standard", "Some patching", "Heavy patching / drywall"] },
    ],
  },
  "flooring": {
    slug: "flooring", label: "Flooring", serviceType: "Flooring install",
    priceLow: 2_000, priceHigh: 18_000, unit: "project",
    questions: [
      { id: "type",   label: "Type",      options: ["Hardwood", "Luxury vinyl plank", "Tile", "Carpet", "Mix"] },
      { id: "size",   label: "Sq ft",     options: ["Under 500", "500–1000", "1000–2000", "2000+"] },
      { id: "scope",  label: "Scope",     options: ["Install only", "Rip out + install"] },
    ],
  },
  "electrical": {
    slug: "electrical", label: "Electrical work", serviceType: "Electrical work",
    priceLow: 400, priceHigh: 8_000, unit: "project",
    questions: [
      { id: "scope", label: "What do you need?", options: ["Panel upgrade", "EV charger install", "Rewiring / repairs", "New outlets / fixtures", "Whole-home generator"] },
      { id: "urgency", label: "Urgency", options: ["ASAP", "Within 2 weeks", "Within a month"] },
    ],
  },
  "plumbing": {
    slug: "plumbing", label: "Plumbing", serviceType: "Plumbing",
    priceLow: 200, priceHigh: 10_000, unit: "project",
    questions: [
      { id: "scope", label: "What do you need?", options: ["Water heater", "Drain cleaning / clog", "Leak / repair", "Sewer line", "Fixture install", "Repipe"] },
      { id: "urgency", label: "Urgency", options: ["Emergency", "Within a few days", "Whenever"] },
    ],
  },
  "hvac": {
    slug: "hvac", label: "HVAC", serviceType: "HVAC",
    priceLow: 500, priceHigh: 15_000, unit: "project",
    questions: [
      { id: "scope", label: "What do you need?", options: ["New system install", "Replacement", "Repair", "Mini-split / ductless", "Heat pump"] },
      { id: "urgency", label: "Urgency", options: ["Not working / emergency", "Within 2 weeks", "Planning ahead"] },
    ],
  },
  "addition": {
    slug: "addition", label: "Home addition", serviceType: "Home addition",
    priceLow: 35_000, priceHigh: 200_000, unit: "project",
    questions: [
      { id: "type", label: "Type of addition", options: ["Bedroom / bath", "Family room", "Second story", "Mother-in-law unit / ADU"] },
      { id: "size", label: "Size", options: ["Under 300 sq ft", "300–600 sq ft", "600+ sq ft"] },
    ],
  },
  "basement-finish": {
    slug: "basement-finish", label: "Basement finish", serviceType: "Basement finish",
    priceLow: 15_000, priceHigh: 60_000, unit: "project",
    questions: [
      { id: "size",   label: "Basement size",   options: ["Under 500 sq ft", "500–1000 sq ft", "1000+ sq ft"] },
      { id: "scope",  label: "What's included?", options: ["Living area only", "Living area + bathroom", "Full apartment / in-law"] },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(TRADES).map((trade) => ({ trade }));
}

export async function generateMetadata({ params }: { params: { trade: string } }): Promise<Metadata> {
  const t = TRADES[params.trade];
  if (!t) return { title: "Free quote | ContractorFlow" };
  return {
    title: `Free ${t.label.toLowerCase()} quote in Massachusetts | ContractorFlow`,
    description: `Get a free, no-pressure ${t.label.toLowerCase()} quote from a licensed Massachusetts contractor. Same-week response. 5-star Google reviews.`,
    alternates: { canonical: `/quote/${t.slug}` },
  };
}

export default function QuotePage({ params }: { params: { trade: string } }) {
  const trade = TRADES[params.trade];
  if (!trade) {
    return (
      <main className="min-h-screen grid place-items-center px-6 text-white" style={{ background: "#06060A" }}>
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-serif">No quote calculator for that trade yet.</h1>
          <p className="mt-3 text-white/60">Browse <Link className="text-brand-300 hover:underline" href="/quote">our list of free quote tools</Link>.</p>
        </div>
      </main>
    );
  }

  const priceMid = Math.round((trade.priceLow + trade.priceHigh) / 2);

  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-3xl mx-auto px-6 py-10 sm:py-16">
          <Link href="/" className="text-xs uppercase tracking-[0.18em] text-white/40 hover:text-white/70">
            ← ContractorFlow
          </Link>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight leading-[1.05]">
            Free <em>{trade.label.toLowerCase()}</em> quote.
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/70 max-w-xl">
            Typical Massachusetts {trade.label.toLowerCase()} runs <span className="text-white font-semibold tabular-nums">${trade.priceLow.toLocaleString()}–${trade.priceHigh.toLocaleString()}</span>. Answer 4 quick questions and we&apos;ll give you a real number — plus a licensed contractor who can do the job.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><ShieldCheck className="h-3 w-3" /> Licensed + insured</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Star className="h-3 w-3" /> 5-star Google reviews</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Clock className="h-3 w-3" /> Same-week response</span>
          </div>

          <div className="mt-8">
            <QuoteWizard trade={trade} priceMid={priceMid} />
          </div>

          <ul className="mt-12 space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> No spam. We respond by SMS or call within one business day.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Free estimate — no obligation to book.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Massachusetts-licensed contractor — we&apos;re local.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
