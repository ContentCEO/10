import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600" />
            <span className="text-lg font-semibold">CallBack AI</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" href="/login">
              Sign in
            </Link>
            <Link
              className="rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700"
              href="/signup"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-700">
          For local service businesses
        </p>
        <h1 className="mb-5 text-5xl font-semibold leading-tight tracking-tight text-slate-900">
          Never lose another lead to a missed call.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600">
          CallBack AI texts your callers back the second a call goes unanswered, qualifies
          them with a friendly conversation, and books appointments while you're on the
          job.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
          >
            Start free trial
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Automatic SMS replies",
              body: "When a call goes unanswered, an AI-written text fires within seconds — apologising and starting the conversation."
            },
            {
              title: "Lead qualification",
              body: "The assistant asks one question at a time to understand what the caller needs and whether they're a fit."
            },
            {
              title: "Booked appointments",
              body: "Once the lead is ready, your booking link is shared and the appointment shows up on your dashboard."
            }
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="mb-2 text-lg font-semibold">{c.title}</h3>
              <p className="text-slate-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CallBack AI
      </footer>
    </main>
  );
}
