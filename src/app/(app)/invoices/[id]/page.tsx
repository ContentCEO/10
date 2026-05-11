import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ExternalLink, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { INVOICE_STATUS_LABELS, type Invoice, type InvoiceStatus } from "@/lib/types";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function update(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const tax = Number(formData.get("tax") ?? 0);
  await supabase.from("invoices").update({
    number:        String(formData.get("number") ?? "").trim() || null,
    customer_id:   (formData.get("customer_id") as string) || null,
    job_id:        (formData.get("job_id") as string) || null,
    amount_cents:  Math.round(amount * 100),
    tax_cents:     Math.round(tax * 100),
    notes:         String(formData.get("notes") ?? "").trim() || null,
    due_at:        (formData.get("due_at") as string) || null,
    issued_at:     (formData.get("issued_at") as string) || null,
    status:        (formData.get("status") as InvoiceStatus) || "draft",
  }).eq("id", id);
  revalidatePath(`/invoices/${id}`);
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("invoices").delete().eq("id", id);
  redirect("/invoices");
}

async function markSent(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/invoices/${id}`);
}

async function markPaid(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/invoices/${id}`);
}

async function markUnpaid(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("invoices")
    .update({ status: "sent", paid_at: null })
    .eq("id", id);
  revalidatePath(`/invoices/${id}`);
}

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: invoice }, { data: customers }, { data: jobs }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", params.id).single(),
    supabase.from("customers").select("id,name").order("name"),
    supabase.from("jobs").select("id,title").order("created_at", { ascending: false }),
  ]);
  if (!invoice) notFound();
  const inv = invoice as Invoice;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const shareUrl = `${baseUrl}/i/${inv.id}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/invoices" className="text-sm text-slate-500">← Invoices</Link>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {inv.number ?? `INV-${inv.id.slice(0, 6).toUpperCase()}`}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <InvoiceStatusBadge status={inv.status} />
            <span>· Created {formatDate(inv.created_at)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> View public page
          </a>
          {inv.status === "draft" && (
            <form action={markSent.bind(null, inv.id)}>
              <button className="btn-primary"><Send className="h-4 w-4" /> Mark sent</button>
            </form>
          )}
          {inv.status === "sent" && (
            <form action={markPaid.bind(null, inv.id)}>
              <button className="btn-primary">Mark paid</button>
            </form>
          )}
          {inv.status === "paid" && (
            <form action={markUnpaid.bind(null, inv.id)}>
              <button className="btn-secondary">Mark unpaid</button>
            </form>
          )}
        </div>
      </header>

      <form action={update.bind(null, inv.id)} className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="number">Invoice number</label>
            <input id="number" name="number" className="input"
              defaultValue={inv.number ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" defaultValue={inv.status}>
              {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="customer_id">Customer</label>
            <select id="customer_id" name="customer_id" className="input"
              defaultValue={inv.customer_id ?? ""}>
              <option value="">— None —</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="job_id">Job</label>
            <select id="job_id" name="job_id" className="input"
              defaultValue={inv.job_id ?? ""}>
              <option value="">— None —</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="issued_at">Issued</label>
            <input id="issued_at" name="issued_at" type="date" className="input"
              defaultValue={inv.issued_at} />
          </div>
          <div>
            <label className="label" htmlFor="due_at">Due</label>
            <input id="due_at" name="due_at" type="date" className="input"
              defaultValue={inv.due_at ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-2 col-span-1">
            <div>
              <label className="label" htmlFor="amount">Amount ($)</label>
              <input id="amount" name="amount" type="number" min="0" step="0.01" className="input"
                defaultValue={(inv.amount_cents / 100).toFixed(2)} />
            </div>
            <div>
              <label className="label" htmlFor="tax">Tax ($)</label>
              <input id="tax" name="tax" type="number" min="0" step="0.01" className="input"
                defaultValue={(inv.tax_cents / 100).toFixed(2)} />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes / line items</label>
          <textarea id="notes" name="notes" rows={5} className="input"
            defaultValue={inv.notes ?? ""} />
        </div>
        <div className="flex justify-between pt-2">
          <button formAction={remove.bind(null, inv.id)} className="btn-danger">Delete</button>
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
