import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUS_LABELS, type Lead, type LeadStatus } from "@/lib/types";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AiTools } from "./AiTools";
import { NextActionPanel } from "./NextActionPanel";

export const dynamic = "force-dynamic";

async function updateLead(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const estimated = formData.get("estimated_value");
  const update = {
    name: String(formData.get("name") ?? "").trim(),
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    service_type: (formData.get("service_type") as string) || null,
    source: (formData.get("source") as string) || null,
    estimated_value: estimated ? Number(estimated) : null,
    status: (formData.get("status") as LeadStatus) || "new",
    notes: (formData.get("notes") as string) || null,
  };
  await supabase.from("leads").update(update).eq("id", id);
  revalidatePath(`/leads/${id}`);
}

async function deleteLead(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("leads").delete().eq("id", id);
  redirect("/leads");
}

async function convertLead(id: string) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lead } = await supabase
    .from("leads").select("*").eq("id", id).single();
  if (!lead) return;

  let customerId = lead.customer_id;
  if (!customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
      })
      .select("id").single();
    customerId = customer?.id ?? null;
    await supabase.from("leads").update({ customer_id: customerId, status: "won" }).eq("id", id);
  }

  const { data: job } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      customer_id: customerId,
      lead_id: id,
      title: lead.service_type ? `${lead.service_type} — ${lead.name}` : `Job for ${lead.name}`,
      price: lead.estimated_value,
      status: "scheduled",
    })
    .select("id").single();

  if (job) redirect(`/jobs/${job.id}`);
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: lead } = await supabase
    .from("leads").select("*").eq("id", params.id).single();
  if (!lead) notFound();
  const l = lead as Lead;

  const update = updateLead.bind(null, l.id);
  const remove = deleteLead.bind(null, l.id);
  const convert = convertLead.bind(null, l.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/leads" className="text-sm text-slate-500">← Leads</Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{l.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <LeadStatusBadge status={l.status} />
            <span>· Created {formatDate(l.created_at)}</span>
          </div>
        </div>
        <form action={convert}>
          <button className="btn-primary">Convert to job</button>
        </form>
      </header>

      <NextActionPanel leadId={l.id} />

      <AiTools lead={l} />

      <form action={update} className="card p-5 space-y-4">
        <h2 className="font-semibold">Lead details</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" defaultValue={l.name} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" defaultValue={l.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" defaultValue={l.email ?? ""} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="service_type">Service</label>
            <input id="service_type" name="service_type" className="input" defaultValue={l.service_type ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="source">Source</label>
            <input id="source" name="source" className="input" defaultValue={l.source ?? ""} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="estimated_value">
              Estimated value ({formatCurrency(l.estimated_value)})
            </label>
            <input id="estimated_value" name="estimated_value" type="number" min="0" step="1"
              className="input" defaultValue={l.estimated_value ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" defaultValue={l.status}>
              {Object.entries(LEAD_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="input" defaultValue={l.notes ?? ""} />
        </div>
        <div className="flex justify-between pt-2">
          <button formAction={remove} className="btn-danger">Delete lead</button>
          <button className="btn-primary">Save changes</button>
        </div>
      </form>
    </div>
  );
}
