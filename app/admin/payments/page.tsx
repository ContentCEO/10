import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supabase = createSupabaseServerClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*, profiles:profiles!payments_customer_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p: any) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.paid_at || p.created_at)}</td>
                <td>
                  <div className="font-medium text-slate-900">{p.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-slate-500">{p.profiles?.email}</div>
                </td>
                <td>{formatCurrency(p.amount_cents, p.currency)}</td>
                <td><StatusBadge value={p.status} /></td>
                <td className="text-xs text-slate-500">{p.description || "—"}</td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No payments yet — Stripe will write here once a subscription invoice is paid.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
