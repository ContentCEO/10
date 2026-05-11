import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createJob(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const price = formData.get("price");
  const payload = {
    user_id: user.id,
    customer_id: (formData.get("customer_id") as string) || null,
    title: String(formData.get("title") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    status: (formData.get("status") as JobStatus) || "scheduled",
    price: price ? Number(price) : null,
  };
  if (!payload.title) return;

  const { data } = await supabase.from("jobs").insert(payload).select("id").single();
  if (data) redirect(`/jobs/${data.id}`);
}

export default async function NewJobPage() {
  const supabase = createClient();
  const { data: customers } = await supabase
    .from("customers").select("id,name").order("name");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/jobs" className="text-sm text-slate-500">← Jobs</Link>
      <h1 className="text-2xl font-bold">New job</h1>

      <form action={createJob} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="customer_id">Customer</label>
          <select id="customer_id" name="customer_id" className="input" defaultValue="">
            <option value="">— None —</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} className="input" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">Start date</label>
            <input id="start_date" name="start_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">End date</label>
            <input id="end_date" name="end_date" type="date" className="input" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="price">Price ($)</label>
            <input id="price" name="price" type="number" min="0" step="1" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" defaultValue="scheduled">
              {Object.entries(JOB_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/jobs" className="btn-secondary">Cancel</Link>
          <button className="btn-primary">Create job</button>
        </div>
      </form>
    </div>
  );
}
