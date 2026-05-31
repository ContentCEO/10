import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Globe, Phone, Star } from "lucide-react";

export const dynamic = "force-static";
export const revalidate = 86400;

/*
 * Cold-outreach mockup page. Davi sends a prospective contractor a link
 * like /preview/joes-roofing-marblehead, the prospect sees a fully-
 * rendered "this is what your site could look like" mock with their
 * business name baked in, with a "Claim this site" CTA pointing to
 * Launchpad pricing.
 *
 * The slug encodes the business name (kebab-case) and optional city.
 * Real-time business data isn't wired yet — for now it's all derived
 * from the slug + sensible defaults.
 */

function decodeSlug(slug: string): { biz: string; city: string | null; tradeGuess: string } {
  const parts = decodeURIComponent(slug).split("-");
  const cityCandidate = parts[parts.length - 1] ?? "";
  const looksLikeCity = /^[a-z]{4,}$/.test(cityCandidate);
  const city = looksLikeCity ? cap(cityCandidate) : null;
  const bizParts = looksLikeCity ? parts.slice(0, -1) : parts;
  const biz = bizParts.map(cap).join(" ") || "Your Business";
  const tradeGuess = inferTrade(biz);
  return { biz, city, tradeGuess };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function inferTrade(biz: string): string {
  const lower = biz.toLowerCase();
  if (/roof/.test(lower))      return "roofing";
  if (/plumb/.test(lower))     return "plumbing";
  if (/electric/.test(lower))  return "electrical";
  if (/hvac|heat|cool/.test(lower)) return "HVAC";
  if (/paint/.test(lower))     return "painting";
  if (/clean/.test(lower))     return "cleaning";
  if (/landscap|lawn/.test(lower)) return "landscaping";
  return "home services";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { biz, city } = decodeSlug(params.slug);
  return {
    title: `${biz}${city ? ` — ${city} MA` : ""} | Preview by Contractor Flow Launchpad`,
    robots: { index: false, follow: false },
  };
}

export default function PreviewMockup({ params }: { params: { slug: string } }) {
  const { biz, city, tradeGuess } = decodeSlug(params.slug);
  const phone = "(555) 123-4567";

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top Contractor Flow attribution bar */}
      <div className="bg-stone-900 text-stone-100 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-violet-500" />
            <span>Preview by <strong>Contractor Flow Launchpad</strong></span>
          </div>
          <Link href="https://contractorflowstore.com/launchpad" className="inline-flex items-center gap-1 rounded-full bg-orange-500 text-white px-3 py-1 font-semibold hover:bg-orange-400 transition">
            Claim this site <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Mock hero */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-xs uppercase tracking-widest text-emerald-200 font-mono">
            {city ? `${city} MA · Licensed + Insured` : "Licensed + Insured"}
          </div>
          <h1 className="mt-4 font-serif text-5xl sm:text-7xl tracking-tight leading-[1.02]">
            {biz}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-stone-100/80 max-w-2xl">
            {capFirst(tradeGuess)} for {city ?? "your area"}. Free estimates. Same-week response. 5-star Google reviews.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`tel:${phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-semibold px-5 py-3 hover:bg-orange-400 transition">
              <Phone className="h-4 w-4" /> Call {phone}
            </a>
            <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/30 text-white font-semibold px-5 py-3 hover:bg-white/20 transition">
              Get a free quote <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3">What we do</div>
        <div className="grid sm:grid-cols-3 gap-4">
          <ServiceCard title="Free in-home estimates" body="Same week. No obligation." />
          <ServiceCard title="Licensed + insured"     body="Massachusetts contractor license. Full liability coverage." />
          <ServiceCard title="5-star Google reviews"  body="Read what our neighbors say about us." />
        </div>
      </section>

      <section className="bg-stone-100 py-14">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono">Recent jobs</div>
            <h2 className="mt-2 font-serif text-3xl tracking-tight">Real work, real homes in {city ?? "Massachusetts"}.</h2>
            <p className="mt-3 text-stone-600 text-sm">
              Every project gets the same care: clean job site, on-time crew, written contract, lifetime workmanship warranty.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-stone-300 grid place-items-center text-stone-500 text-xs">Project {i}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Star className="h-6 w-6 text-amber-500 mx-auto mb-3" />
        <p className="font-serif text-2xl italic text-stone-700">
          &ldquo;{biz} did our {tradeGuess === "home services" ? "kitchen" : tradeGuess} and we couldn&apos;t be happier. Quick turnaround, fair price.&rdquo;
        </p>
        <p className="mt-3 text-xs text-stone-500">— A homeowner in {city ?? "MA"}</p>
      </section>

      {/* Claim banner */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 ring-1 ring-orange-400/40 text-orange-200 px-3 py-1 text-[10px] font-mono uppercase tracking-wider mb-4">
            Contractor Flow Launchpad
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight">
            This could be your <em className="not-italic underline decoration-orange-400 decoration-4 underline-offset-4">real site</em> in 2 weeks.
          </h2>
          <p className="mt-4 text-stone-300 max-w-xl mx-auto">
            We&apos;ll build it, run your Google + Meta ads, and report back monthly. You take the leads. From $1,997 one-time or $497/mo with revenue share.
          </p>
          <Link href="https://contractorflowstore.com/launchpad" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-semibold px-6 py-3 hover:bg-orange-400 transition">
            Claim this site <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-stone-100 text-xs text-stone-500 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span>Preview generated by Contractor Flow Launchpad</span>
          <Link href="https://contractorflowstore.com" className="hover:underline">contractorflowstore.com</Link>
        </div>
      </footer>
    </main>
  );
}

function ServiceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-5">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-2" />
      <div className="font-semibold text-stone-900">{title}</div>
      <div className="mt-1 text-sm text-stone-600">{body}</div>
    </div>
  );
}

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
