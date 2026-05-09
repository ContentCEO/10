import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createLead(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const estimated = formData.get("estimated_value");
  const payload = {
    user_id: user.id,
    name: String(formData.get("name") ?? "").trim(),
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    source: (formData.get("source") as string) || null,
    service_type: (formData.get("service_type") as string) || null,
    estimated_value: estimated ? Number(estimated) : null,
    status: (formData.get("status") as LeadStatus) || "new",
    notes: (formData.get("notes") as string) || null,
  };
  if (!payload.name) return;

  const { data, error } = await supabase.from("leads").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create lead");
  redirect(`/leads/${data.id}`);
}

export default function NewLeadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/leads" className="text-sm text-slate-500">← Leads</Link>
      <h1 className="text-2xl font-bold">New lead</h1>

      <form action={createLead} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="service_type">Service</label>
            <input id="service_type" name="service_type" className="input"
              placeholder="Roof repair, kitchen remodel…" />
          </div>
          <div>
            <label className="label" htmlFor="source">Source</label>
            <input id="source" name="source" className="input" placeholder="Referral, Google, …" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="estimated_value">Estimated value ($)</label>
            <input id="estimated_value" name="estimated_value" type="number" min="0" step="1" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" defaultValue="new">
              {Object.entries(LEAD_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="input" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/leads" className="btn-secondary">Cancel</Link>
          <button className="btn-primary">Create lead</button>
        </div>
      </form>
    </div>
  );
}
