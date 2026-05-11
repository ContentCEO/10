import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Customer, Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysOverdue(due: string | null) {
  if (!due) return null;
  const d = Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
  return d > 0 ? d : null;
}

export default async function InvoicesPage() {
  const supabase = createClient();
  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("customers").select("id,name"),
  ]);
  const rows = (invoices ?? []) as Invoice[];
  const customerNameById = new Map(
    ((customers ?? []) as Pick<Customer, "id" | "name">[]).map((c) => [c.id, c.name]),
  );

  const totals = {
    outstanding: rows
      .filter((i) => i.status === "sent")
      .reduce((s, i) => s + i.amount_cents + i.tax_cents, 0),
    paid: rows
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount_cents + i.tax_cents, 0),
    draft: rows.filter((i) => i.status === "draft").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-slate-500">Bill customers and track who owes you money.</p>
        </div>
        <Link href="/invoices/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New invoice
        </Link>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Tile label="Outstanding"   value={money(totals.outstanding)}
              icon={CircleDollarSign} tone="amber" />
        <Tile label="Paid (lifetime)" value={money(totals.paid)}
              icon={CircleDollarSign} tone="emerald" />
        <Tile label="Drafts"         value={String(totals.draft)}
              icon={CircleDollarSign} tone="slate" />
      </section>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Customer</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Issued</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((i) => {
              const overdue = i.status === "sent" ? daysOverdue(i.due_at) : null;
              return (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${i.id}`} className="font-medium text-brand-700">
                      {i.number ?? `INV-${i.id.slice(0, 6).toUpperCase()}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {i.customer_id ? customerNameById.get(i.customer_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {formatDate(i.issued_at)}
                  </td>
                  <td className="px-4 py-3">
                    {i.due_at ? formatDate(i.due_at) : "—"}
                    {overdue != null && (
                      <span className="ml-2 badge bg-rose-100 text-rose-700 ring-rose-200">
                        {overdue}d late
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{money(i.amount_cents + i.tax_cents)}</td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={i.status} /></td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No invoices yet. <Link href="/invoices/new" className="text-brand-600 font-medium">Create one</Link> —
                  or open a completed job and click "Create invoice".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tile({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone: "amber" | "emerald" | "slate";
}) {
  const toneClass = tone === "amber"
    ? "bg-gradient-to-br from-amber-500 to-orange-500"
    : tone === "emerald"
      ? "bg-gradient-to-br from-emerald-500 to-teal-500"
      : "bg-gradient-to-br from-slate-500 to-slate-700";
  return (
    <div className={`stat-tile ${toneClass}`}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>
      <div className="relative z-10 mt-3 text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}
