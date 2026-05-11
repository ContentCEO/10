import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Job } from "@/lib/types";
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
