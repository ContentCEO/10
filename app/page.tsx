import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold">
          <span className="text-brand-600">●</span> LocalContent AI
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <span className="badge bg-brand-100 text-brand-700">Built for local businesses</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          A month of social posts in <span className="text-brand-600">one click</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          LocalContent AI writes Instagram captions, Reels ideas, before-and-after posts,
          promotional offers, and hashtags tailored to your business and your city — so you can
          stop staring at a blank caption box.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base px-5 py-3">
            Generate 30 days of content
          </Link>
          <Link href="/login" className="btn-secondary text-base px-5 py-3">
            I have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Instagram captions", "Hooks, value, and a soft CTA — never sounds like a robot."],
            ["TikTok / Reel ideas", "Hook, shot list, on-screen text, and trending audio."],
            ["Before & after", "Frame the transformation and drive bookings."],
            ["Promotional offers", "Time-bound, ethical urgency that converts."],
            ["Hashtags", "Niche + local + broad — auto-mixed for reach."],
            ["Image prompts", "Optional prompts you can paste into any image model."],
          ].map(([h, p]) => (
            <div key={h} className="card">
              <h3 className="font-semibold">{h}</h3>
              <p className="mt-1 text-sm text-slate-600">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} LocalContent AI
      </footer>
    </main>
  );
}
