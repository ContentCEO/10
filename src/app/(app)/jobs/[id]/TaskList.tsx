"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListChecks, Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  is_done: boolean;
  done_at: string | null;
  sort_order: number;
}

export function TaskList({ jobId, tasks }: { jobId: string; tasks: Task[] }) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const done = tasks.filter((t) => t.is_done).length;
  const total = tasks.length;

  function add() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await fetch("/api/jobs/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, title: newTitle.trim() }),
      });
      setNewTitle("");
      router.refresh();
    });
  }

  function toggle(id: string, isDone: boolean) {
    startTransition(async () => {
      await fetch("/api/jobs/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_done: !isDone }),
      });
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-brand-600" /> Task checklist
        </h2>
        <span className="text-xs text-ink-500 tabular-nums font-mono">
          {done} / {total}
        </span>
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-emerald-500"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
        </div>
      )}

      <ul className="space-y-1 mb-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 py-1.5">
            <button
              onClick={() => toggle(t.id, t.is_done)}
              disabled={pending}
              className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                t.is_done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-ink-300 hover:border-brand-500"
              }`}>
              {t.is_done && <Check className="h-3 w-3" />}
            </button>
            <span className={`flex-1 text-sm ${t.is_done ? "text-ink-400 line-through" : "text-ink-800"}`}>
              {t.title}
            </span>
            {t.done_at && (
              <span className="text-[10px] text-ink-400 tabular-nums font-mono">
                {new Date(t.done_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task…"
          className="input text-sm flex-1"
          maxLength={200}
        />
        <button onClick={add} disabled={pending || !newTitle.trim()} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </section>
  );
}
