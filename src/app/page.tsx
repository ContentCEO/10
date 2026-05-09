import Link from "next/link";

const features = [
  { title: "Local SEO audit", desc: "Score your site, GBP, and on-page signals in seconds." },
  { title: "AI improvement plan", desc: "A prioritized, step-by-step roadmap tailored to your business." },
  { title: "Review responder", desc: "Draft on-brand replies to Google reviews in one click." },
  { title: "Keyword ideas", desc: "Local-intent keyword suggestions based on your services and area." },
  { title: "Competitor comparison", desc: "Stack up against the local pack and find the gaps." },
  { title: "Monthly PDF report", desc: "A polished progress report you can send to clients." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-700">
          LocalRank<span className="text-brand-500">AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
          Local SEO copilot for small businesses
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Rank higher in your city. Without hiring an agency.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          LocalRank AI audits your site and Google Business Profile, builds a prioritized plan, drafts review
          replies, and ships a polished monthly report — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary">Get started — it&apos;s free</Link>
          <Link href="/dashboard" className="btn-secondary">See the demo dashboard</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="text-sm font-semibold text-brand-700">{f.title}</div>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} LocalRank AI</span>
          <span>Built with Next.js, Supabase, and Claude.</span>
        </div>
      </footer>
    </div>
  );
}
