import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Calendar, CheckCircle2, CircleDollarSign } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Invoice, Profile } from "@/lib/types";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PublicInvoice({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: invData } = await admin
    .from("invoices").select("*").eq("id", params.id).single();
  if (!invData) notFound();
  const inv = invData as Invoice;
  if (inv.status === "void") notFound();

  const [{ data: profile }, { data: customer }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", inv.user_id).single(),
    inv.customer_id
      ? admin.from("customers").select("*").eq("id", inv.customer_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const p = (profile as (Profile & { payment_link_url?: string | null }) | null);
  const c = (customer as Customer | null);
  const total = inv.amount_cents + inv.tax_cents;
  const paid = inv.status === "paid";

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="card p-8 sm:p-10 relative overflow-hidden">
          {p?.logo_url && (
            <img src={p.logo_url} alt=""
              className="absolute top-6 right-6 h-14 w-14 rounded-lg object-cover" />
          )}

          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            Invoice from {p?.business_name ?? "Your contractor"}
          </div>
          <h1 className="mt-2 text-3xl font-bold">
            {inv.number ?? `INV-${inv.id.slice(0, 6).toUpperCase()}`}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <InvoiceStatusBadge status={inv.status} />
            {paid && (
              <span className="text-emerald-700 text-sm flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Paid {inv.paid_at ? formatDate(inv.paid_at) : ""}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Billed to</div>
              <div className="mt-1 font-medium">{c?.name ?? "—"}</div>
              <div className="text-slate-600">{c?.email ?? ""}</div>
              <div className="text-slate-600">{c?.address ?? ""}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Dates</div>
              <div className="mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Issued {formatDate(inv.issued_at)}
              </div>
              {inv.due_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Due {formatDate(inv.due_at)}
                </div>
              )}
            </div>
          </div>

          {inv.notes && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-line text-slate-800">
              {inv.notes}
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5 space-y-2 text-sm">
            <Row label="Subtotal" value={money(inv.amount_cents)} />
            {inv.tax_cents > 0 && <Row label="Tax" value={money(inv.tax_cents)} />}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-base font-semibold">Total due</span>
              <span className="text-2xl font-bold gradient-text">{money(total)}</span>
            </div>
          </div>

          {!paid && (
            <div className="mt-7">
              {p?.payment_link_url ? (
                <a
                  href={p.payment_link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full text-base py-3"
                >
                  <CircleDollarSign className="h-5 w-5" /> Pay now
                </a>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Please reach out to {p?.business_name ?? "your contractor"} for payment
                  instructions{p?.phone_public ? ` — ${p.phone_public}` : ""}.
                </div>
              )}
            </div>
          )}

          <footer className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <div>{p?.business_name ?? "ContractorFlow"}</div>
            <Link href="/" className="hover:text-slate-700">Powered by ContractorFlow</Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
