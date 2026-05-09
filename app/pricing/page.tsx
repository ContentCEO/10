import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = createSupabaseServerClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/" className="text-sm text-brand-700 hover:underline">← Back home</Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Membership plans</h1>
      <p className="mt-2 text-slate-600">
        Recurring monthly memberships, billed by Stripe. Cancel any time from your portal.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {(plans ?? []).map((p: Plan) => (
          <div key={p.id} className="card flex flex-col p-6">
            <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.description}</p>
            <div className="mt-4 text-3xl font-bold text-slate-900">
              {formatCurrency(p.price_cents)}
              <span className="text-base font-normal text-slate-500">/mo</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{p.visits_per_year} visits/year</p>
            <ul className="mt-4 flex-1 space-y-1 text-sm text-slate-700">
              {(p.features ?? []).map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary mt-6">Become a member</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
