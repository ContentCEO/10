"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

const NEXT: Record<string, string> = {
  scheduled: "en_route",
  en_route: "in_progress",
  in_progress: "completed"
};
const LABEL: Record<string, string> = {
  scheduled: "Mark en route",
  en_route: "Start work",
  in_progress: "Complete"
};

export default function JobActions({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function update(newStatus: string) {
    startTransition(async () => {
      await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      router.refresh();
    });
  }

  if (["completed", "canceled"].includes(status)) return <span className="text-xs text-slate-400">—</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      {NEXT[status] && (
        <button className="btn-secondary text-xs" disabled={pending} onClick={() => update(NEXT[status])}>
          {LABEL[status]}
        </button>
      )}
      <button className="text-xs text-rose-600 hover:underline" disabled={pending} onClick={() => update("canceled")}>
        Cancel
      </button>
    </div>
  );
}
