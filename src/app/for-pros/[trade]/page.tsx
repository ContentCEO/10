import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { TRADES, getTrade } from "@/lib/trades";

export const dynamic = "force-static";
export const revalidate = 86400;

export function generateStaticParams() {
  return TRADES.map((t) => ({ trade: t.slug }));
}

export async function generateMetadata({ params }: { params: { trade: string } }): Promise<Metadata> {
  const t = getTrade(params.trade);
  if (!t) return { title: "Lead-gen for trade pros | ContractorFlow" };
  return {
    title: `Lead generation for ${t.labelPlural} in Massachusetts | ContractorFlow`,
    description: `Real residential leads with name + phone + address, delivered to MA ${t.labelPlural.toLowerCase()} every weekday. Pay per lead, no monthly minimum.`,
    alternates: { canonical: `/for-pros/${t.slug}` },
  };
}

export default function TradeProRecruitmentPage({ params }: { params: { trade: string } }) {
  const trade = getTrade(params.trade);
  if (!trade) notFound();

  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-20">
          <Link href="/" className="text-xs uppercase tracking-[0.18em] text-white/40 hover:text-white/70">
            ← ContractorFlow
          </Link>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500/[0.12] ring-1 ring-brand-400/30 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-brand-200">
            For {trade.labelPlural}
          </div>

          <h1 className="mt-4 font-serif text-4xl sm:text-6xl tracking-tight leading-[1.05]">
            <em>{trade.hero}</em>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl">
            ContractorFlow scrapes Massachusetts permits, deeds, storm reports, and runs paid lead ads. We send the leads that match your trade to you — name, phone, address, project type — every weekday.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/signup?role=contractor&trade=${trade.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition">
              Get {trade.label.toLowerCase()} leads <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/find-pro"
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] ring-1 ring-white/15 text-white font-semibold px-5 py-3 hover:bg-white/[0.10] transition">
              I&apos;m a homeowner instead
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trade.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/80">{b}</span>
              </li>
            ))}
          </ul>

          <section className="mt-12 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl sm:text-3xl text-white">How it works</h2>
            <ol className="mt-4 space-y-3 text-sm text-white/70 list-decimal pl-5">
              <li><strong>Sign up</strong> — takes 3 minutes. Pick your service area + budget cap.</li>
              <li><strong>We send leads</strong> matching your trade to your inbox + SMS within minutes of the homeowner submitting a quote request, pulling a permit, or filing a deed.</li>
              <li><strong>You contact them.</strong> Lead has name + phone + address + project description. Reply within 5 min for 9× higher close rate.</li>
              <li><strong>You only pay per lead claimed.</strong> No monthly minimum, no setup fee. Cancel anytime.</li>
            </ol>
          </section>

          <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <ShieldCheck className="h-5 w-5 text-emerald-300 mb-2" />
              <div className="text-sm font-semibold">Verified leads only</div>
              <div className="mt-1 text-xs text-white/60">Name + phone validated. MA-only. Filtered for contractor intent.</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <Zap className="h-5 w-5 text-amber-300 mb-2" />
              <div className="text-sm font-semibold">Speed wins jobs</div>
              <div className="mt-1 text-xs text-white/60">Instant SMS the moment a matching lead arrives. Reply fast, win the job.</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <CheckCircle2 className="h-5 w-5 text-brand-300 mb-2" />
              <div className="text-sm font-semibold">No bidding war</div>
              <div className="mt-1 text-xs text-white/60">Buy a lead and you&apos;re the only pro contacted (subject to your tier).</div>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl text-white">Other trades we serve</h2>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              {TRADES.filter((t) => t.slug !== trade.slug).map((t) => (
                <li key={t.slug}>
                  <Link href={`/for-pros/${t.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] ring-1 ring-white/10 px-3 py-1.5 text-white/70 hover:bg-white/[0.08] hover:text-white transition">
                    For {t.labelPlural.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-12 text-center">
            <Link href={`/signup?role=contractor&trade=${trade.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition">
              Start getting {trade.label.toLowerCase()} leads <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-white/40">3-minute signup · no contract · cancel anytime</p>
          </div>
        </div>
      </div>
    </main>
  );
}
