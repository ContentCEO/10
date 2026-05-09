import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
            AI
          </span>
          AIStaffer
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="text-center">
          <p className="mb-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            Now available — AI Receptionist for contractors
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Hire your first <span className="text-brand-600">AI employee</span> in minutes.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            AIStaffer lets you spin up purpose-built AI staff — receptionist,
            sales rep, estimator, support — that answer questions, qualify
            leads, and book appointments 24/7 across your website and chat.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="btn-primary">
              Create your AI Receptionist
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "AI Receptionist",
              body: "Answers calls and chats, qualifies leads, books appointments.",
              available: true,
            },
            {
              title: "Sales Rep",
              body: "Follows up leads, sends quotes, books demos.",
              available: false,
            },
            {
              title: "Estimator",
              body: "Quotes from your price book and scope rules.",
              available: false,
            },
            {
              title: "Support Agent",
              body: "Answers FAQs and handles tier-1 tickets.",
              available: false,
            },
          ].map((c) => (
            <div key={c.title} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{c.title}</h3>
                {c.available ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 grid gap-8 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Tell us about your business",
              body: "Hours, services, pricing, FAQs, policies. The AI learns your voice.",
            },
            {
              n: "2",
              title: "Publish your AI employee",
              body: "Get a hosted chat page and an embed snippet for your website.",
            },
            {
              n: "3",
              title: "Capture qualified leads",
              body: "Conversations turn into structured leads with next-step suggestions.",
            },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">
                {s.n}
              </div>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} AIStaffer
      </footer>
    </div>
  );
}
