import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AlertTriangle, Plus, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Equipment {
  id: string;
  name: string;
  serial: string | null;
  purchase_cents: number;
  status: "available" | "checked_out" | "maintenance" | "lost";
  checked_out_job_id: string | null;
  due_back_at: string | null;
  notes: string | null;
}
interface JobLite { id: string; title: string; }

const STATUS_TONE: Record<Equipment["status"], string> = {
  available:    "bg-emerald-100 text-emerald-700 ring-emerald-200",
  checked_out:  "bg-amber-100 text-amber-700 ring-amber-200",
  maintenance:  "bg-violet-100 text-violet-700 ring-violet-200",
  lost:         "bg-rose-100 text-rose-700 ring-rose-200",
};

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const purchaseRaw = Number(formData.get("purchase") ?? 0);
  await supabase.from("equipment").insert({
    user_id: user.id,
    name,
    serial: String(formData.get("serial") ?? "").trim() || null,
    purchase_cents: Math.round(purchaseRaw * 100),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/equipment");
}

async function checkOut(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const jobId = String(formData.get("job_id") ?? "") || null;
  const due = String(formData.get("due_back_at") ?? "") || null;
  if (!id) return;
  await supabase.from("equipment").update({
    status: "checked_out",
    checked_out_job_id: jobId,
    due_back_at: due,
  }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/equipment");
}

async function checkIn(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("equipment").update({
    status: "available",
    checked_out_job_id: null,
    due_back_at: null,
  }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/equipment");
}

export default async function EquipmentPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: jobs }] = await Promise.all([
    supabase.from("equipment").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("jobs").select("id,title")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .order("start_date", { ascending: true }),
  ]);

  const rows = (items ?? []) as Equipment[];
  const jobList = (jobs ?? []) as JobLite[];
  const jobMap = new Map(jobList.map((j) => [j.id, j.title]));

  const now = Date.now();
  const overdue = rows.filter((e) =>
    e.status === "checked_out" && e.due_back_at && new Date(e.due_back_at).getTime() < now);
  const available  = rows.filter((e) => e.status === "available");
  const checkedOut = rows.filter((e) => e.status === "checked_out");

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Wrench className="h-3.5 w-3.5" /> Operations · Equipment</span>
          <h1 className="mt-2 display-h2">
            Where&apos;s your <em>stuff</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Track tools and equipment, who has what, when it&apos;s due back.
            Catch overdue items before they vanish.
          </p>
          {overdue.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-rose-100 text-rose-800 ring-1 ring-rose-200 rounded-full px-3 py-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{overdue.length} overdue · {overdue.map((e) => e.name).join(", ")}</span>
            </div>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total items"   value={String(rows.length)} />
        <Stat label="Available"     value={String(available.length)} />
        <Stat label="Checked out"   value={String(checkedOut.length)} />
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Add equipment
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="DeWalt impact driver" maxLength={120} />
          </div>
          <div>
            <label className="label">Serial</label>
            <input name="serial" className="input" placeholder="DCF887" maxLength={60} />
          </div>
          <div>
            <label className="label">Purchase ($)</label>
            <input name="purchase" type="number" step="0.01" inputMode="decimal" className="input text-right tabular-nums" placeholder="245" />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save item
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Inventory</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No equipment yet.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((e) => {
              const isOverdue = e.status === "checked_out" && e.due_back_at && new Date(e.due_back_at).getTime() < now;
              return (
                <li key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-ink-500">
                      {e.serial && <span className="font-mono mr-2">{e.serial}</span>}
                      {e.checked_out_job_id && jobMap.get(e.checked_out_job_id) && (
                        <span>at <span className="font-medium">{jobMap.get(e.checked_out_job_id)}</span></span>
                      )}
                      {e.due_back_at && (
                        <span className={`ml-2 ${isOverdue ? "text-rose-700 font-semibold" : ""}`}>
                          due {new Date(e.due_back_at).toLocaleDateString()}
                          {isOverdue ? " · OVERDUE" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_TONE[e.status]}`}>{e.status.replace("_", " ")}</span>
                  {e.status === "available" ? (
                    <form action={checkOut} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={e.id} />
                      <select name="job_id" className="input text-xs py-1 px-2 min-w-[120px]">
                        <option value="">— Job —</option>
                        {jobList.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                      <input type="date" name="due_back_at" className="input text-xs py-1 px-2" />
                      <button type="submit" className="btn-secondary text-xs py-1 px-2">Out</button>
                    </form>
                  ) : e.status === "checked_out" ? (
                    <form action={checkIn}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="btn-primary text-xs py-1 px-3">Check in</button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
