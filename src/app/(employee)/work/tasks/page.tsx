import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_LABELS, type DailyTask } from "@/lib/types";

export const dynamic = "force-dynamic";

async function updateStatus(id: string, status: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("daily_tasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  }).eq("id", id);
  revalidatePath("/work/tasks");
}

export default async function EmployeeTasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("daily_tasks").select("*").eq("employee_id", user.id)
    .order("status").order("due_at", { ascending: true });
  const tasks = (data ?? []) as DailyTask[];

  const open = tasks.filter((t) => t.status !== "done" && t.status !== "skipped");
  const done = tasks.filter((t) => t.status === "done" || t.status === "skipped");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">All tasks</h1>
        <p className="text-sm text-slate-500">Everything assigned to you, ordered by status and due date.</p>
      </header>

      <Section title="Open" tasks={open} action={updateStatus} />
      <Section title="Completed" tasks={done} action={updateStatus} done />
    </div>
  );
}

function Section({
  title, tasks, action, done,
}: {
  title: string;
  tasks: DailyTask[];
  action: (id: string, status: string) => Promise<void>;
  done?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="font-semibold mb-3">{title} ({tasks.length})</h2>
      <ul className="card divide-y divide-slate-100">
        {tasks.map((t) => (
          <li key={t.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`font-medium ${done ? "line-through text-slate-400" : ""}`}>
                {t.title}
              </div>
              <div className="text-xs text-slate-500">
                {TASK_STATUS_LABELS[t.status]}
                {t.due_at ? ` · Due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                {t.notes ? ` · ${t.notes}` : ""}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {t.status === "pending" && (
                <form action={action.bind(null, t.id, "in_progress")}>
                  <button className="btn-secondary !py-1 text-xs">Start</button>
                </form>
              )}
              {t.status !== "done" && (
                <form action={action.bind(null, t.id, "done")}>
                  <button className="btn-primary !py-1 text-xs">Mark done</button>
                </form>
              )}
              {t.status === "done" && (
                <form action={action.bind(null, t.id, "pending")}>
                  <button className="btn-secondary !py-1 text-xs">Reopen</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
