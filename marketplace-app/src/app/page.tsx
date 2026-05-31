import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Hammer, Megaphone, ShieldCheck, Star, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Contractor Flow Marketplace — Massachusetts contractor leads",
  description: "Free quotes for MA homeowners. Real residential leads for trade pros. Permits, deeds, paid ads — all in one place.",
};

const HOMEOWNER_TRADES = [
  { slug: "kitchen-remodel", label: "Kitchen" },
  { slug: "bathroom-remodel", label: "Bathroom" },
  { slug: "roofing", label: "Roofing" },
  { slug: "siding", label: "Siding" },
  { slug: "painting", label: "Painting" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "hvac", label: "HVAC" },
];

const PRO_TRADES = [
  { slug: "electricians", label: "Electricians" },
  { slug: "plumbers", label: "Plumbers" },
  { slug: "hvac", label: "HVAC pros" },
  { slug: "roofers", label: "Roofers" },
  { slug: "painters", label: "Painters" },
  { slug: "general-contractors", label: "General contractors" },
];

export default function MarketplaceLanding() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(74, 93, 58, 0.30), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(99, 102, 241, 0.18), transparent 60%)",
          }} />
        <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20">
          <Link href="https://contractorflowstore.com" className="text-xs uppercase tracking-[0.18em] text-white/40 hover:text-white/70">
            ← Contractor Flow
          </Link>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.12] ring-1 ring-emerald-400/30 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-200">
            Contractor Flow Marketplace
          </div>

          <h1 className="mt-4 font-serif text-5xl sm:text-7xl tracking-tight leading-[1.02]">
            Massachusetts <em>contractor leads</em>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl">
            Homeowners get free quotes from licensed pros. Contractors get real residential leads with name, phone, and address — delivered every weekday.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">For homeowners</div>
              <h2 className="mt-2 font-serif text-3xl">Get a free quote.</h2>
              <p className="mt-2 text-sm text-white/70">
                Pick your project. Answer 3 quick questions. Get a real cost estimate plus a licensed MA contractor who can do the job — same week.
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {HOMEOWNER_TRADES.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/quote/${t.slug}`} className="inline-flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 text-white/80 hover:bg-white/[0.10] hover:text-white px-2.5 py-1 text-xs font-medium transition">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/quote" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold px-4 py-2.5 text-sm hover:bg-emerald-500 transition">
                Browse all quotes <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">For trade pros</div>
              <h2 className="mt-2 font-serif text-3xl">Get leads sent to you.</h2>
              <p className="mt-2 text-sm text-white/70">
                Real residential leads — name, phone, address — delivered to MA trade pros every weekday. Pay per lead, no monthly minimum.
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {PRO_TRADES.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/for-pros/${t.slug}`} className="inline-flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 text-white/80 hover:bg-white/[0.10] hover:text-white px-2.5 py-1 text-xs font-medium transition">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/for-pros" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-semibold px-4 py-2.5 text-sm hover:bg-indigo-500 transition">
                Browse trade pages <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>

          <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <ShieldCheck className="h-5 w-5 text-emerald-300 mb-3" />
              <div className="font-semibold text-white">MA only</div>
              <div className="mt-1 text-xs text-white/60">Every lead filtered for Massachusetts homeowners with verified phone numbers.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <Megaphone className="h-5 w-5 text-indigo-300 mb-3" />
              <div className="font-semibold text-white">22 lead sources</div>
              <div className="mt-1 text-xs text-white/60">Permits, deeds, storm reports, Reddit, NextDoor, Facebook groups, Meta Ads.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <Star className="h-5 w-5 text-amber-300 mb-3" />
              <div className="font-semibold text-white">5-star reviews</div>
              <div className="mt-1 text-xs text-white/60">Every listed contractor screened. Licensed, insured, locally rated.</div>
            </div>
          </section>

          <p className="mt-16 text-xs text-white/40">
            Part of the <Link href="https://contractorflowstore.com" className="text-white/60 hover:text-white/80 underline">Contractor Flow</Link> family.
          </p>
        </div>
      </div>
    </main>
  );
}
