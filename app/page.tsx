import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand-600 grid place-items-center text-white font-bold">L</div>
          <span className="font-semibold">LeadRevive AI</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <p className="text-brand-600 font-semibold uppercase tracking-wide text-xs">Lead reactivation, on autopilot</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
          Wake up your old leads with AI follow-ups.
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Upload a CSV of cold leads. LeadRevive writes personalized SMS and email
          messages that sound like you, sends them on a schedule, and tracks replies
          all the way to booked.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-primary">Upload your first 100 leads</Link>
          <Link href="/login" className="btn-secondary">Sign in</Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          {[
            { t: "1. Upload", d: "Drop in a CSV. We auto-map names, emails, phones, and notes." },
            { t: "2. Generate", d: "AI drafts personalized SMS + email per lead, in your voice." },
            { t: "3. Send & track", d: "Send manually or schedule a sequence. Watch replies flow in." },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <h3 className="font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
