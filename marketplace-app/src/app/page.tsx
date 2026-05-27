import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Hammer, Megaphone, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contractor Flow Marketplace — MA contractor leads, on demand",
  description: "Massachusetts contractors get qualified residential leads with name, phone, and address. Homeowners get free quotes from licensed pros.",
};

export default function MarketplaceLanding() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/60">
            Contractor Flow Marketplace
          </div>
          <h1 className="mt-4 font-serif text-5xl sm:text-7xl tracking-tight leading-[1.02]">
            Massachusetts <em>contractor leads</em>, on demand.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/70 max-w-2xl">
            We scrape permits, deeds, storm reports, run paid lead ads, and answer your missed calls with an AI receptionist. Real residential leads — name, phone, address — delivered to MA trade pros every weekday.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/for-pros" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition">
              I&apos;m a contractor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/quote" className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] ring-1 ring-white/15 text-white font-semibold px-5 py-3 hover:bg-white/[0.10] transition">
              I&apos;m a homeowner <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
              <Hammer className="h-5 w-5 text-brand-300 mb-3" />
              <div className="font-semibold">12 trades</div>
              <div className="mt-1 text-sm text-white/60">Electrical, plumbing, HVAC, roofing, painting, flooring, concrete, landscaping, and more.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
              <Megaphone className="h-5 w-5 text-amber-300 mb-3" />
              <div className="font-semibold">22+ sources</div>
              <div className="mt-1 text-sm text-white/60">Permits, deeds, evictions, foreclosures, NextDoor, Facebook groups, Reddit, Craigslist, Meta Ads.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
              <ShieldCheck className="h-5 w-5 text-emerald-300 mb-3" />
              <div className="font-semibold">MA-only</div>
              <div className="mt-1 text-sm text-white/60">Strict filter: name + phone + MA zip + contractor intent + last 30 days. Quality over volume.</div>
            </div>
          </div>

          <p className="mt-16 text-xs text-white/40">
            Part of the <Link href="https://contractorflowstore.com" className="text-white/60 hover:text-white/80 underline">Contractor Flow</Link> family.
          </p>
        </div>
      </div>
    </main>
  );
}
