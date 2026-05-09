import Link from "next/link";
import { PLANS } from "@/lib/plans";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block h-7 w-7 rounded-md bg-forge-600" />
            <span className="text-lg font-semibold tracking-tight">AdForge AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-outline">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="badge bg-forge-100 text-forge-700">AI ads for Meta, Facebook & Instagram</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight">
          Generate scroll-stopping Meta ads in seconds.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600">
          Plug in your business, product, and offer. AdForge AI writes hooks, headlines,
          primary text, image prompts, video scripts, and a full campaign structure — ready
          to paste into Ads Manager.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">
            Start free — no card required
          </Link>
          <Link href="/login" className="btn-outline">
            Log in
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Hooks & headlines", d: "Stop the scroll with multiple angles per generation." },
            { t: "Primary text & CTAs", d: "Direct-response copy in your brand voice." },
            { t: "Image prompts", d: "Vivid prompts ready for Midjourney, DALL·E, or Firefly." },
            { t: "Video scripts", d: "30-second UGC-style scripts with timestamps." },
            { t: "Campaign plans", d: "Audiences, placements, budget splits, KPIs." },
            { t: "CSV export", d: "Bulk import or hand to your media buyer." },
          ].map((f) => (
            <div key={f.t} className="card">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className="card flex flex-col">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-bold">{p.price}<span className="text-sm font-normal text-zinc-500">/mo</span></p>
                <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-700">
                  {p.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <Link href="/signup" className="btn-primary mt-6">
                  Get {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} AdForge AI. Not affiliated with Meta.
        </div>
      </footer>
    </div>
  );
}
