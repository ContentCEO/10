import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen">
      <header className="border-b border-ink-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary">
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <span className="badge bg-brand-500/20 text-brand-200">
          AI sales coach for contractors
        </span>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
          Close <span className="text-brand-300">more jobs</span> from the calls
          you're already running.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-400">
          ContractorClose AI listens to your sales calls, scores them 1-100,
          shows what you missed, and writes the perfect follow-up — so every
          lead has a real shot of closing.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base">
            Try it free →
          </Link>
          <Link href="/login" className="btn-secondary text-base">
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            title="Score every call"
            body="Get an instant 1-100 grade on discovery, rapport, objection handling, and the close."
          />
          <Feature
            title="See what you missed"
            body="A specific list of moments where you could have gone deeper, with the exact words to use next time."
          />
          <Feature
            title="Beat objections"
            body="Save responses to 'price is too high,' 'I need to talk to my spouse,' and the rest in your own library."
          />
          <Feature
            title="Auto-write follow-ups"
            body="Personalized email and SMS drafted from the call. Copy, paste, send."
          />
          <Feature
            title="Lead close probability"
            body="Know which leads are worth chasing — and which need a different play."
          />
          <Feature
            title="Track your improvement"
            body="Average score, streaks, and a trend chart so you can see real progress month over month."
          />
        </div>
      </section>

      <section className="border-t border-ink-700 bg-ink-800/40">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold text-white">
            Built for roofers, HVAC, remodelers, plumbers and every trade in
            between.
          </h2>
          <p className="mt-3 text-ink-400">
            Stop losing $14k jobs to "I'll think about it." Start your 7-day
            free trial.
          </p>
          <div className="mt-6">
            <Link href="/signup" className="btn-primary text-base">
              Get started
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-700">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-ink-500">
          © {new Date().getFullYear()} ContractorClose AI
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-ink-200">{body}</p>
    </div>
  );
}
