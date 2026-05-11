import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { FollowUp, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createFollowUp(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const due = formData.get("due_at") as string;
  if (!due) return;

  await supabase.from("follow_ups").insert({
    user_id: user.id,
    title: String(formData.get("title") ?? "").trim() || "Follow-up",
    notes: (formData.get("notes") as string) || null,
    due_at: new Date(due).toISOString(),
    lead_id: (formData.get("lead_id") as string) || null,
  });
  revalidatePath("/calendar");
}

async function complete(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("follow_ups")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/calendar");
}

async function uncomplete(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("follow_ups").update({ completed_at: null }).eq("id", id);
  revalidatePath("/calendar");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("follow_ups").delete().eq("id", id);
  revalidatePath("/calendar");
}

function bucket(items: FollowUp[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfter = new Date(todayStart); dayAfter.setDate(dayAfter.getDate() + 2);

  const overdue: FollowUp[] = [];
  const today: FollowUp[] = [];
  const tomorrow: FollowUp[] = [];
  const upcoming: FollowUp[] = [];
  const done: FollowUp[] = [];

  for (const f of items) {
    if (f.completed_at) { done.push(f); continue; }
    const t = new Date(f.due_at);
    if (t < todayStart) overdue.push(f);
    else if (t < tomorrowStart) today.push(f);
    else if (t < dayAfter) tomorrow.push(f);
    else upcoming.push(f);
  }
  return { overdue, today, tomorrow, upcoming, done };
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default async function CalendarPage() {
  const supabase = createClient();
  const [{ data: followUps }, { data: leads }] = await Promise.all([
    supabase.from("follow_ups").select("*").order("due_at"),
    supabase.from("leads").select("id,name").order("created_at", { ascending: false }).limit(50),
  ]);

  const groups = bucket((followUps ?? []) as FollowUp[]);

  function Section({ title, items, tone }: { title: string; items: FollowUp[]; tone: "red" | "blue" | "slate" | "emerald" }) {
    if (!items.length) return null;
    const toneClass = {
      red: "text-red-700",
      blue: "text-brand-700",
      slate: "text-slate-600",
      emerald: "text-emerald-700",
    }[tone];
    return (
      <section className="space-y-2">
        <h2 className={`text-sm font-semibold ${toneClass}`}>{title}</h2>
        <ul className="card divide-y divide-slate-100">
          {items.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className={`font-medium ${f.completed_at ? "line-through text-slate-400" : ""}`}>
                  {f.title}
                </div>
                <div className="text-xs text-slate-500">
                  {fmtTime(f.due_at)}{f.notes ? ` · ${f.notes}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <form action={f.completed_at ? uncomplete.bind(null, f.id) : complete.bind(null, f.id)}>
                  <button className="btn-secondary !py-1 text-xs">
                    {f.completed_at ? "Undo" : "Done"}
                  </button>
                </form>
                <form action={remove.bind(null, f.id)}>
                  <button className="btn-secondary !py-1 text-xs">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Calendar &amp; reminders</h1>
        <p className="text-sm text-slate-500">Schedule follow-ups for your leads and customers.</p>
      </header>

      <form action={createFollowUp} className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">New follow-up</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" required className="input" placeholder="Call John about estimate" />
          </div>
          <div>
            <label className="label" htmlFor="due_at">When</label>
            <input id="due_at" name="due_at" type="datetime-local" required className="input" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="lead_id">Linked lead (optional)</label>
            <select id="lead_id" name="lead_id" className="input" defaultValue="">
              <option value="">— None —</option>
              {(leads as Pick<Lead, "id" | "name">[] | null)?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes</label>
            <input id="notes" name="notes" className="input" />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Schedule</button>
        </div>
      </form>

      <Section title="Overdue" items={groups.overdue} tone="red" />
      <Section title="Today" items={groups.today} tone="blue" />
      <Section title="Tomorrow" items={groups.tomorrow} tone="slate" />
      <Section title="Upcoming" items={groups.upcoming} tone="slate" />
      <Section title="Completed" items={groups.done} tone="emerald" />

      {!followUps?.length && (
        <p className="card p-8 text-center text-sm text-slate-500">
          No reminders yet. Schedule your first follow-up above.
        </p>
      )}
    </div>
  );
}
