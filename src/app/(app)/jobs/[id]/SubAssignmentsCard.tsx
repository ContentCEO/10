import { revalidatePath } from "next/cache";
import { HardHat, Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Sub {
  id: string;
  name: string;
  trade: string | null;
  rate_kind: "hourly" | "flat" | "percent";
  rate_cents: number;
}

interface Assignment {
  id: string;
  subcontractor_id: string;
  hours: number | null;
  payout_cents: number;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

async function assign(jobId: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const subId = String(formData.get("subcontractor_id") ?? "");
  if (!subId) return;
  const hours = Number(formData.get("hours") ?? 0);
  const payoutRaw = Number(formData.get("payout") ?? 0);
  await supabase.from("subcontractor_assignments").insert({
    user_id: user.id,
    subcontractor_id: subId,
    job_id: jobId,
    hours: hours > 0 ? hours : null,
    payout_cents: Math.round(payoutRaw * 100),
    notes: (String(formData.get("notes") ?? "").trim() || null),
  });
  revalidatePath(`/jobs/${jobId}`);
}

async function markPaid(jobId: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("subcontractor_assignments")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id);
  revalidatePath(`/jobs/${jobId}`);
}

export async function SubAssignmentsCard({ jobId }: { jobId: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: subs }, { data: assigns }] = await Promise.all([
    supabase.from("subcontractors").select("id,name,trade,rate_kind,rate_cents")
      .eq("user_id", user.id).eq("is_active", true).order("name"),
    supabase.from("subcontractor_assignments")
      .select("id,subcontractor_id,hours,payout_cents,paid_at,notes,created_at")
      .eq("user_id", user.id).eq("job_id", jobId)
      .order("created_at", { ascending: false }),
  ]);

  const subList = (subs ?? []) as Sub[];
  const assignList = (assigns ?? []) as Assignment[];
  const subMap = new Map(subList.map((s) => [s.id, s]));

  const totalOwed = assignList.filter((a) => !a.paid_at).reduce((s, a) => s + a.payout_cents, 0);
  const totalPaid = assignList.filter((a) =>  a.paid_at).reduce((s, a) => s + a.payout_cents, 0);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <HardHat className="h-4 w-4 text-brand-600" /> Subcontractors
        </h2>
        <div className="text-xs text-ink-500 tabular-nums font-mono">
          owed <span className="text-rose-700 font-semibold">${(totalOwed / 100).toFixed(0)}</span>
          {" · "}
          paid <span className="text-emerald-700 font-semibold">${(totalPaid / 100).toFixed(0)}</span>
        </div>
      </div>

      {subList.length === 0 ? (
        <div className="text-sm text-ink-500 italic">
          Add subcontractors first at <a href="/subcontractors" className="text-brand-600 font-medium">/subcontractors</a>.
        </div>
      ) : (
        <form action={assign.bind(null, jobId)} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end mb-4">
          <div className="sm:col-span-2">
            <label className="label">Subcontractor</label>
            <select name="subcontractor_id" className="input" required>
              <option value="">— Select —</option>
              {subList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.trade ? ` · ${s.trade}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Hours</label>
            <input name="hours" type="number" step="0.25" inputMode="decimal" className="input text-right tabular-nums" placeholder="0" />
          </div>
          <div>
            <label className="label">Payout ($)</label>
            <input name="payout" type="number" step="0.01" inputMode="decimal" className="input text-right tabular-nums" placeholder="0.00" required />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Assign &amp; log
            </button>
          </div>
        </form>
      )}

      {assignList.length > 0 && (
        <ul className="divide-y divide-ink-100">
          {assignList.map((a) => {
            const sub = subMap.get(a.subcontractor_id);
            return (
              <li key={a.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {sub?.name ?? "(removed)"}
                    {sub?.trade && <span className="text-ink-500 font-normal"> · {sub.trade}</span>}
                  </div>
                  <div className="text-xs text-ink-500 tabular-nums">
                    {a.hours ? `${a.hours}h · ` : ""}
                    ${(a.payout_cents / 100).toFixed(2)}
                    {a.paid_at && <span className="text-emerald-700 ml-1"><Check className="h-3 w-3 inline" /> paid {new Date(a.paid_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                {!a.paid_at && (
                  <form action={markPaid.bind(null, jobId)}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn-secondary text-xs py-1 px-2">Mark paid</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
