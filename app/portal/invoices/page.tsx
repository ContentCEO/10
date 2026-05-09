import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PortalInvoices() {
  const profile = await requireCustomer();
  const supabase = createSupabaseServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", profile.id)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr><th>Number</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id}>
                <td className="font-mono text-xs">{inv.number}</td>
                <td>{formatDate(inv.issued_at)}</td>
                <td>{inv.due_date ? formatDate(inv.due_date) : "On receipt"}</td>
                <td>{formatCurrency(inv.total_cents)}</td>
                <td><StatusBadge value={inv.status} /></td>
              </tr>
            ))}
            {(invoices ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
