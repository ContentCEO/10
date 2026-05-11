import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  RECURRING_FREQUENCY_LABELS,
  type Customer,
  type Job,
  type RecurringFrequency,
} from "@/lib/types";
import { JobStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function update(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase.from("customers").update({
    name: String(formData.get("name") ?? "").trim(),
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }).eq("id", id);
  revalidatePath(`/customers/${id}`);
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("customers").delete().eq("id", id);
  redirect("/customers");
}

async function saveRecurring(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const active = formData.get("recurring_active") === "on";
  const freq = formData.get("recurring_frequency") as RecurringFrequency | "";
  const price = formData.get("recurring_price");
  const next = formData.get("recurring_next_at");
  await supabase.from("customers").update({
    recurring_active: active,
    recurring_frequency: freq || null,
    recurring_service:   String(formData.get("recurring_service") ?? "").trim() || null,
    recurring_price:     price ? Number(price) : null,
    recurring_next_at:   (next as string) || null,
  }).eq("id", id);
  revalidatePath(`/customers/${id}`);
}

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: customer }, { data: jobs }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", params.id).single(),
    supabase.from("jobs").select("*").eq("customer_id", params.id).order("created_at", { ascending: false }),
  ]);
  if (!customer) notFound();
  const c = customer as Customer;
  const js = (jobs ?? []) as Job[];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/customers" className="text-sm text-slate-500">← Customers</Link>

      <header>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <div className="text-sm text-slate-500">Added {formatDate(c.created_at)}</div>
      </header>

      <form action={update.bind(null, c.id)} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" defaultValue={c.name} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" defaultValue={c.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" defaultValue={c.email ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" name="address" className="input" defaultValue={c.address ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="input" defaultValue={c.notes ?? ""} />
        </div>
        <div className="flex justify-between pt-2">
          <button formAction={remove.bind(null, c.id)} className="btn-danger">Delete</button>
          <button className="btn-primary">Save changes</button>
        </div>
      </form>

      <form action={saveRecurring.bind(null, c.id)} className="card p-5 space-y-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow">
            <Repeat className="h-4 w-4" />
          </span>
          <h2 className="font-semibold">Recurring service</h2>
          {c.recurring_active && (
            <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 ml-auto">Active</span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Put this customer on a recurring schedule and ContractorFlow auto-creates the
          next job + reminder when it's due. Predictable monthly revenue with zero admin.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recurring_active" defaultChecked={c.recurring_active} />
          <span><strong>Enable</strong> recurring service for this customer</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="recurring_frequency">Frequency</label>
            <select id="recurring_frequency" name="recurring_frequency" className="input"
              defaultValue={c.recurring_frequency ?? ""}>
              <option value="">— Choose —</option>
              {Object.entries(RECURRING_FREQUENCY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="recurring_next_at">Next service date</label>
            <input id="recurring_next_at" name="recurring_next_at" type="date" className="input"
              defaultValue={c.recurring_next_at ?? ""} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="recurring_service">Service description</label>
            <input id="recurring_service" name="recurring_service" className="input"
              placeholder="Standard cleaning, lawn maintenance…"
              defaultValue={c.recurring_service ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="recurring_price">Price per visit ($)</label>
            <input id="recurring_price" name="recurring_price" type="number" min="0" step="1" className="input"
              defaultValue={c.recurring_price ?? ""} />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Save schedule</button>
        </div>
      </form>

      <section>
        <h2 className="font-semibold mb-3">Jobs</h2>
        <div className="card divide-y divide-slate-100">
          {js.length ? js.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div>
                <div className="font-medium">{j.title}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(j.start_date)} · {formatCurrency(j.price)}
                </div>
              </div>
              <JobStatusBadge status={j.status} />
            </Link>
          )) : (
            <div className="px-4 py-8 text-sm text-center text-slate-500">No jobs for this customer yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
