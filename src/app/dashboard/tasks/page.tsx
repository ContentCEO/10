import Link from "next/link";
import { revalidatePath } from "next/cache";
import { deleteTask, getActiveBusiness, listTasks, upsertTask } from "@/lib/data";
import type { Task } from "@/lib/types";

async function add(formData: FormData) {
  "use server";
  const business_id = formData.get("business_id") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!business_id || !title) return;
  await upsertTask({
    business_id,
    title,
    description: (formData.get("description") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    priority: ((formData.get("priority") as string) || "medium") as Task["priority"],
  });
  revalidatePath("/dashboard/tasks");
}

async function setStatus(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const business_id = formData.get("business_id") as string;
  const title = formData.get("title") as string;
  const status = (formData.get("status") as Task["status"]) ?? "todo";
  await upsertTask({ id, business_id, title, status });
  revalidatePath("/dashboard/tasks");
}

async function remove(formData: FormData) {
  "use server";
  await deleteTask(formData.get("id") as string);
  revalidatePath("/dashboard/tasks");
}

export default async function TasksPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const all = await listTasks(b.id);
  const cols: Array<{ key: Task["status"]; label: string }> = [
    { key: "todo", label: "To do" },
    { key: "doing", label: "In progress" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Task tracker</h1>
        <p className="text-sm text-slate-600">Plan and ship your local SEO work.</p>
      </div>

      <form action={add} className="card grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="business_id" value={b.id} />
        <input name="title" required placeholder="New task" className="input sm:col-span-2" />
        <input name="due_date" type="date" className="input" />
        <select name="priority" className="input" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input name="description" placeholder="Optional details" className="input sm:col-span-3" />
        <button className="btn-primary">Add task</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((col) => {
          const items = all.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">{col.label} ({items.length})</h2>
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{t.title}</div>
                        {t.description && <div className="mt-1 text-xs text-slate-600">{t.description}</div>}
                        <div className="mt-1 flex gap-2 text-[10px] uppercase">
                          <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
                          {t.due_date && <span className="badge bg-slate-100 text-slate-600">due {t.due_date}</span>}
                        </div>
                      </div>
                      <form action={remove}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="text-slate-400 hover:text-red-600" aria-label="Delete">×</button>
                      </form>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {cols
                        .filter((c) => c.key !== t.status)
                        .map((c) => (
                          <form key={c.key} action={setStatus}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="business_id" value={t.business_id} />
                            <input type="hidden" name="title" value={t.title} />
                            <input type="hidden" name="status" value={c.key} />
                            <button className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50">
                              → {c.label}
                            </button>
                          </form>
                        ))}
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className="text-xs text-slate-400">Nothing here.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function priorityClass(p: string) {
  switch (p) {
    case "high": return "bg-red-100 text-red-700";
    case "medium": return "bg-amber-100 text-amber-700";
    default: return "bg-slate-100 text-slate-600";
  }
}
