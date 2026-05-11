import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function createInvoice(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = Number(formData.get("amount") ?? 0);
  const tax = Number(formData.get("tax") ?? 0);
  if (!amount || amount <= 0) return;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      customer_id: (formData.get("customer_id") as string) || null,
      job_id:      (formData.get("job_id") as string) || null,
      number:      String(formData.get("number") ?? "").trim() || null,
      amount_cents: Math.round(amount * 100),
      tax_cents:    Math.round(tax * 100),
      notes:       String(formData.get("notes") ?? "").trim() || null,
      due_at:      (formData.get("due_at") as string) || null,
      issued_at:   (formData.get("issued_at") as string) || new Date().toISOString().slice(0, 10),
    })
    .select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create invoice");
  redirect(`/invoices/${data.id}`);
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { job?: string };
}) {
  const supabase = createClient();
  const [{ data: customers }, { data: jobs }, job] = await Promise.all([
    supabase.from("customers").select("id,name").order("name"),
    supabase.from("jobs").select("id,title,price,customer_id").order("created_at", { ascending: false }),
    searchParams.job
      ? supabase.from("jobs").select("*").eq("id", searchParams.job).single().then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const due = new Date();
  due.setDate(due.getDate() + 14);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/invoices" className="text-sm text-slate-500">← Invoices</Link>
      <h1 className="text-2xl font-bold">New invoice</h1>

      <form action={createInvoice} className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="number">Invoice number</label>
            <input id="number" name="number" className="input"
              placeholder="INV-001 (optional)"
              defaultValue={job?.title ? "" : ""} />
          </div>
          <div>
            <label className="label" htmlFor="issued_at">Issued</label>
            <input id="issued_at" name="issued_at" type="date" className="input"
              defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="customer_id">Customer</label>
            <select id="customer_id" name="customer_id" className="input"
              defaultValue={(job?.customer_id as string | undefined) ?? ""}>
              <option value="">— None —</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="job_id">Job</label>
            <select id="job_id" name="job_id" className="input"
              defaultValue={searchParams.job ?? ""}>
              <option value="">— None —</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="amount">Amount ($)</label>
            <input id="amount" name="amount" type="number" min="0" step="0.01" required className="input"
              defaultValue={job?.price ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="tax">Tax ($)</label>
            <input id="tax" name="tax" type="number" min="0" step="0.01" className="input"
              defaultValue="0" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="due_at">Due date</label>
          <input id="due_at" name="due_at" type="date" className="input"
            defaultValue={due.toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes / line items</label>
          <textarea id="notes" name="notes" rows={4} className="input"
            placeholder="Scope of work, line items, payment terms…"
            defaultValue={job?.title ? `For: ${job.title}` : ""} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/invoices" className="btn-secondary">Cancel</Link>
          <button className="btn-primary">Create draft</button>
        </div>
      </form>
    </div>
  );
}
