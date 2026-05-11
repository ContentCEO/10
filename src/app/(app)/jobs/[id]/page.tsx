import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUS_LABELS, type Job, type JobStatus } from "@/lib/types";
import { JobStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReviewRequestPanel } from "./ReviewRequestPanel";

export const dynamic = "force-dynamic";

async function update(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const price = formData.get("price");
  const costEst = formData.get("cost_estimate");
  const costAct = formData.get("cost_actual");
  await supabase.from("jobs").update({
    title: String(formData.get("title") ?? "").trim(),
    description: (formData.get("description") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    status: (formData.get("status") as JobStatus) || "scheduled",
    price: price ? Number(price) : null,
    cost_estimate_cents: costEst ? Math.round(Number(costEst) * 100) : null,
    cost_actual_cents:   costAct ? Math.round(Number(costAct) * 100) : null,
    customer_id: (formData.get("customer_id") as string) || null,
  }).eq("id", id);
  revalidatePath(`/jobs/${id}`);
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("jobs").delete().eq("id", id);
  redirect("/jobs");
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: job }, { data: customers }, { data: { user } }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", params.id).single(),
    supabase.from("customers").select("id,name").order("name"),
    supabase.auth.getUser(),
  ]);
  if (!job) notFound();
  const j = job as Job;

  let customerName: string | null = null;
  if (j.customer_id) {
    const found = (customers ?? []).find((c) => c.id === j.customer_id);
    customerName = found?.name ?? null;
  }

  // Margin
  const costActual = j.cost_actual_cents != null ? j.cost_actual_cents / 100 : null;
  const costEstimate = j.cost_estimate_cents != null ? j.cost_estimate_cents / 100 : null;
  const cost = costActual ?? costEstimate;
  const profit = j.price != null && cost != null ? j.price - cost : null;
  const margin = profit != null && j.price ? Math.round((profit / j.price) * 100) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/jobs" className="text-sm text-slate-500">← Jobs</Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{j.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <JobStatusBadge status={j.status} />
            <span>· Created {formatDate(j.created_at)}</span>
          </div>
        </div>
      </header>

      {(profit != null) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Profitability
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <Metric label="Revenue" value={formatCurrency(j.price)} />
            <Metric
              label={j.cost_actual_cents != null ? "Actual cost" : "Est. cost"}
              value={formatCurrency(cost)}
            />
            <Metric
              label="Profit"
              value={`${formatCurrency(profit)}${margin != null ? ` · ${margin}%` : ""}`}
              tone={profit >= 0 ? "good" : "bad"}
            />
          </div>
        </div>
      )}

      {j.status === "completed" && (
        <ReviewRequestPanel
          jobId={j.id}
          customerName={customerName}
          serviceTitle={j.title}
          alreadySent={j.review_requested_at}
        />
      )}

      <form action={update.bind(null, j.id)} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required className="input" defaultValue={j.title} />
        </div>
        <div>
          <label className="label" htmlFor="customer_id">Customer</label>
          <select id="customer_id" name="customer_id" className="input" defaultValue={j.customer_id ?? ""}>
            <option value="">— None —</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} className="input"
            defaultValue={j.description ?? ""} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">Start date</label>
            <input id="start_date" name="start_date" type="date" className="input"
              defaultValue={j.start_date ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="end_date">End date</label>
            <input id="end_date" name="end_date" type="date" className="input"
              defaultValue={j.end_date ?? ""} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="price">Price ($)</label>
            <input id="price" name="price" type="number" min="0" step="1" className="input"
              defaultValue={j.price ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" defaultValue={j.status}>
              {Object.entries(JOB_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cost_estimate">Est. cost ($)</label>
            <input id="cost_estimate" name="cost_estimate" type="number" min="0" step="1" className="input"
              defaultValue={costEstimate ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="cost_actual">Actual cost ($)</label>
            <input id="cost_actual" name="cost_actual" type="number" min="0" step="1" className="input"
              defaultValue={costActual ?? ""} />
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <button formAction={remove.bind(null, j.id)} className="btn-danger">Delete</button>
          <button className="btn-primary">Save changes</button>
        </div>
      </form>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-900";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );
}
