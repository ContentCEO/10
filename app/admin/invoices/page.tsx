import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import InvoiceForm from "./InvoiceForm";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, profiles:profiles!invoices_customer_id_fkey(full_name, email)")
      .order("issued_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("role", "customer").order("full_name")
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900">Create invoice</h2>
        <InvoiceForm customers={(customers ?? []).map((c) => ({ id: c.id, label: c.full_name || c.email }))} />
      </div>

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv: any) => (
              <tr key={inv.id}>
                <td className="font-mono text-xs">{inv.number}</td>
                <td>
                  <div className="font-medium text-slate-900">{inv.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-slate-500">{inv.profiles?.email}</div>
                </td>
                <td>{formatCurrency(inv.total_cents)}</td>
                <td><StatusBadge value={inv.status} /></td>
                <td>{formatDate(inv.issued_at)}</td>
                <td>{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                <td>
                  <Link href={`/admin/invoices/${inv.id}`} className="text-sm text-brand-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {(invoices ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
