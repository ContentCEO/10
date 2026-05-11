import { revalidatePath } from "next/cache";
import { Plus, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DailyTask, EmployeeInvite, EmployeeLink, TimeEntry } from "@/lib/types";
import { TASK_STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CopyField } from "../integrations/CopyField";

export const dynamic = "force-dynamic";

function randomCode() {
  const groups = [];
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let g = 0; g < 3; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    groups.push(s);
  }
  return groups.join("-");
}

async function createInvite(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const email = String(formData.get("email") ?? "").trim() || null;
  const role  = String(formData.get("role") ?? "crew").trim() || "crew";
  const rate  = formData.get("hourly_rate");
  await supabase.from("employee_invites").insert({
    contractor_id: user.id,
    code: randomCode(),
    email,
    role,
    hourly_rate_cents: rate ? Math.round(Number(rate) * 100) : null,
  });
  revalidatePath("/team");
}

async function revokeInvite(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("employee_invites").delete().eq("id", id);
  revalidatePath("/team");
}

async function removeEmployee(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("employee_links").update({ status: "removed" }).eq("id", id);
  revalidatePath("/team");
}

async function assignTask(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await supabase.from("daily_tasks").insert({
    contractor_id: user.id,
    employee_id: (formData.get("employee_id") as string) || null,
    job_id:      (formData.get("job_id") as string) || null,
    title,
    notes:  String(formData.get("notes") ?? "").trim() || null,
    due_at: (formData.get("due_at") as string)
      ? new Date(formData.get("due_at") as string).toISOString()
      : null,
  });
  revalidatePath("/team");
}

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: invites }, { data: links }, { data: tasks }, { data: jobs }] = await Promise.all([
    supabase.from("employee_invites").select("*")
      .eq("contractor_id", user.id).is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("employee_links").select("*")
      .eq("contractor_id", user.id).neq("status", "removed"),
    supabase.from("daily_tasks").select("*")
      .eq("contractor_id", user.id).neq("status", "done")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("jobs").select("id,title").order("created_at", { ascending: false }).limit(50),
  ]);

  const inviteList = (invites ?? []) as EmployeeInvite[];
  const linkList   = (links   ?? []) as EmployeeLink[];
  const taskList   = (tasks   ?? []) as DailyTask[];

  // Pull employee profiles + this-week time totals via admin (cross-user reads).
  const admin = createAdminClient();
  const employeeIds = linkList.map((l) => l.employee_id);
  const [{ data: profiles }, { data: weekEntries }] = employeeIds.length
    ? await Promise.all([
        admin.from("profiles").select("id,email,full_name").in("id", employeeIds),
        admin.from("time_entries").select("employee_id,clock_in_at,clock_out_at")
          .in("employee_id", employeeIds)
          .gte("clock_in_at", weekStartIso()),
      ])
    : [{ data: [] }, { data: [] }];

  const profileByEmp = new Map(
    ((profiles ?? []) as { id: string; email: string | null; full_name: string | null }[]).map((p) => [p.id, p]),
  );
  const hoursByEmp = new Map<string, number>();
  for (const e of (weekEntries ?? []) as Pick<TimeEntry, "employee_id" | "clock_in_at" | "clock_out_at">[]) {
    const ms = (e.clock_out_at ? new Date(e.clock_out_at).getTime() : Date.now())
             - new Date(e.clock_in_at).getTime();
    hoursByEmp.set(e.employee_id, (hoursByEmp.get(e.employee_id) ?? 0) + ms / 3_600_000);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" /> Team
          </h1>
          <p className="text-sm text-slate-500">
            Invite crew members, see who's clocked in, and assign tasks for the day.
          </p>
        </div>
      </header>

      <section className="card p-5 space-y-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Invite an employee</h2>
        </div>
        <form action={createInvite} className="grid sm:grid-cols-3 gap-3">
          <input name="email" type="email" className="input" placeholder="Email (optional)" />
          <input name="role" className="input" placeholder="Role (crew, lead, etc.)" defaultValue="crew" />
          <input name="hourly_rate" type="number" min="0" step="0.01" className="input"
            placeholder="Hourly rate ($)" />
          <div className="sm:col-span-3 flex justify-end">
            <button className="btn-primary">Create invite code</button>
          </div>
        </form>
        {inviteList.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {inviteList.map((inv) => (
              <li key={inv.id} className="py-3 grid sm:grid-cols-[1fr_auto] gap-2 items-center">
                <div>
                  <CopyField value={`${baseUrl}/signup?invite=${inv.code}`} />
                  <div className="text-xs text-slate-500 mt-1">
                    Code: <code>{inv.code}</code> · expires {formatDate(inv.expires_at)}
                    {inv.email ? ` · for ${inv.email}` : ""}
                    {inv.hourly_rate_cents != null ? ` · $${(inv.hourly_rate_cents / 100).toFixed(2)}/hr` : ""}
                  </div>
                </div>
                <form action={revokeInvite.bind(null, inv.id)}>
                  <button className="btn-secondary !py-1 text-xs">Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          Send the link to your employee. They'll sign up as <strong>Employee</strong> and
          the invite auto-applies on creation.
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Roster</h2>
        {linkList.length > 0 ? (
          <ul className="card divide-y divide-slate-100">
            {linkList.map((l) => {
              const prof = profileByEmp.get(l.employee_id);
              const hrs = hoursByEmp.get(l.employee_id) ?? 0;
              return (
                <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {prof?.full_name || prof?.email || "Employee"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {l.role} · {l.status}
                      {l.hourly_rate_cents != null ? ` · $${(l.hourly_rate_cents / 100).toFixed(2)}/hr` : ""}
                      {" · "}{hrs.toFixed(1)}h this week
                    </div>
                  </div>
                  <form action={removeEmployee.bind(null, l.id)}>
                    <button className="btn-secondary !py-1 text-xs">Remove</button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-500">
            No crew yet. Generate an invite above and share the link.
          </div>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-brand-600" /> Assign a task</h2>
        <form action={assignTask} className="space-y-3">
          <input name="title" required className="input" placeholder="e.g. Pre-clean inspection at 9am" />
          <div className="grid sm:grid-cols-3 gap-3">
            <select name="employee_id" className="input" defaultValue="">
              <option value="">— Anyone (unassigned) —</option>
              {linkList.map((l) => {
                const prof = profileByEmp.get(l.employee_id);
                return (
                  <option key={l.id} value={l.employee_id}>
                    {prof?.full_name || prof?.email || "Employee"}
                  </option>
                );
              })}
            </select>
            <select name="job_id" className="input" defaultValue="">
              <option value="">— No job —</option>
              {(jobs ?? []).map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <input name="due_at" type="datetime-local" className="input" />
          </div>
          <textarea name="notes" rows={2} className="input" placeholder="Notes (optional)" />
          <div className="flex justify-end">
            <button className="btn-primary">Add task</button>
          </div>
        </form>
        {taskList.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {taskList.map((t) => {
              const prof = t.employee_id ? profileByEmp.get(t.employee_id) : null;
              return (
                <li key={t.id} className="py-2 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-slate-500">
                    {TASK_STATUS_LABELS[t.status]}
                    {prof ? ` · ${prof.full_name || prof.email}` : " · Unassigned"}
                    {t.due_at ? ` · ${new Date(t.due_at).toLocaleString()}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function weekStartIso() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
