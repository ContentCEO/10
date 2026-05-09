import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="bg-gradient-to-b from-white to-brand-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold text-brand-700">
          HomeCare Club
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="btn-ghost">Plans</Link>
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="badge bg-brand-100 text-brand-800">For handyman businesses</span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Sell home maintenance memberships. Run your business on autopilot.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              HomeCare Club turns one-off service calls into recurring revenue. Stripe-billed
              subscriptions, scheduling, reminders, and invoicing — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">Start free</Link>
              <Link href="/pricing" className="btn-secondary">See member plans</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              First handyman to sign up becomes the admin. Customers join below.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">What members get</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>✅ Routine maintenance visits scheduled automatically</li>
              <li>✅ Priority booking for repairs</li>
              <li>✅ Email & SMS reminders before each visit</li>
              <li>✅ Member discount on hourly work</li>
              <li>✅ One simple monthly bill via Stripe</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-bold text-slate-900">Membership plans</h2>
        <p className="mt-1 text-slate-600">Pick the plan that fits your home.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {(plans ?? []).map((p: Plan) => (
            <div key={p.id} className="card flex flex-col p-6">
              <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              <div className="mt-4 text-3xl font-bold text-slate-900">
                {formatCurrency(p.price_cents)}
                <span className="text-base font-normal text-slate-500">/mo</span>
              </div>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-slate-700">
                {(p.features ?? []).map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary mt-6 w-full">
                Become a member
              </Link>
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <p className="text-sm text-slate-500">
              No plans yet — once Supabase is configured and the schema is loaded, plans will appear here.
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
          © {new Date().getFullYear()} HomeCare Club. Built with Next.js, Supabase, and Stripe.
        </div>
      </footer>
    </main>
  );
}
