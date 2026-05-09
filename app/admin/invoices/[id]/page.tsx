import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import InvoiceStatusActions from "./InvoiceStatusActions";

export const dynamic = "force-dynamic";

export default async function AdminInvoiceDetail({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, profiles:profiles!invoices_customer_id_fkey(full_name, email, street, city, state, postal_code)")
    .eq("id", params.id)
    .single();
  if (!invoice) notFound();
  const { data: lines } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", params.id)
    .order("id");

  const customer = (invoice as any).profiles;

  return (
    <div className="space-y-6">
      <Link href="/admin/invoices" className="text-sm text-brand-700 hover:underline">← All invoices</Link>

      <div className="card p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice {invoice.number}</h1>
            <p className="mt-1 text-sm text-slate-500">Issued {formatDate(invoice.issued_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge value={invoice.status} />
            <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</h3>
            <p className="mt-1 font-medium text-slate-900">{customer?.full_name}</p>
            <p className="text-sm text-slate-600">{customer?.email}</p>
            {customer?.street && (
              <p className="text-sm text-slate-600">
                {customer.street}<br />
                {customer.city}{customer.city ? ", " : ""}{customer.state} {customer.postal_code}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due</h3>
            <p className="mt-1 text-sm text-slate-700">
              {invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}
            </p>
          </div>
        </div>

        <table className="table-base mt-8 border-t border-slate-200">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td>{Number(l.quantity)}</td>
                <td>{formatCurrency(l.unit_price_cents)}</td>
                <td className="text-right">{formatCurrency(l.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(invoice.subtotal_cents)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(invoice.tax_cents)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <span>Total</span><span>{formatCurrency(invoice.total_cents)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
            <strong className="text-slate-900">Notes: </strong>{invoice.notes}
          </div>
        )}
      </div>
    </div>
  );
}
