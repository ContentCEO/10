import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, Zap, Wallet } from "lucide-react";
import { TRADES } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Lead generation for Massachusetts trade pros | ContractorFlow",
  description: "Real residential leads delivered to electricians, plumbers, HVAC pros, roofers, painters, and more — every weekday. Pay per lead.",
  alternates: { canonical: "/for-pros" },
};

export default function ForProsIndex() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-5xl mx-auto px-6 py-12 sm:py-20">
          <Link href="/" className="text-xs uppercase tracking-[0.18em] text-white/40 hover:text-white/70">
            ← ContractorFlow
          </Link>
          <h1 className="mt-4 font-serif text-4xl sm:text-6xl tracking-tight leading-[1.05]">
            Pick your <em>trade</em>. We&apos;ll send the leads.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl">
            ContractorFlow is a Massachusetts-only lead-gen platform for trade pros. We pull permits, deeds, storm reports, and run paid lead ads — then route the matching leads to you. Real names, real phone numbers, real addresses.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><ShieldCheck className="h-3 w-3" /> MA-only</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Zap className="h-3 w-3" /> Instant SMS alerts</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-white/70"><Wallet className="h-3 w-3" /> Pay per lead</span>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRADES.map((t) => (
              <li key={t.slug}>
                <Link href={`/for-pros/${t.slug}`}
                  className="group block rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 hover:bg-white/[0.06] hover:ring-brand-400/40 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white text-lg">{t.labelPlural}</div>
                      <div className="mt-1 text-xs text-white/60 line-clamp-2">{t.hero}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-brand-300 transition shrink-0 mt-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-8 text-center">
            <h2 className="font-serif text-2xl text-white">Don&apos;t see your trade?</h2>
            <p className="mt-2 text-sm text-white/60 max-w-lg mx-auto">
              We classify leads into 21+ trade categories. Sign up as a contractor and pick whatever services you offer — the system routes leads to you accordingly.
            </p>
            <Link href="/signup?role=contractor"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition">
              General contractor signup <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
