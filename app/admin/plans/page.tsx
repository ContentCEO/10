import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import PlanForm from "./PlanForm";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const supabase = createSupabaseServerClient();
  const { data: plans } = await supabase.from("plans").select("*").order("price_cents", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Plans</h1>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900">Create a plan</h2>
        <p className="text-sm text-slate-500">
          Create the matching recurring product/price in Stripe and paste the price ID here.
        </p>
        <PlanForm />
      </div>

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Visits/yr</th>
              <th>Stripe price ID</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {(plans ?? []).map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.description}</div>
                </td>
                <td>{formatCurrency(p.price_cents)}/mo</td>
                <td>{p.visits_per_year}</td>
                <td className="font-mono text-xs">{p.stripe_price_id || "—"}</td>
                <td>{p.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {(plans ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No plans yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
