"use client";

import { useState, useTransition } from "react";
import { setPublished, deleteEmployee } from "@/app/(dashboard)/employees/[id]/actions";
import { useRouter } from "next/navigation";

export function PublishControls({
  employeeId,
  initialPublished,
}: {
  employeeId: string;
  initialPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [published, setPub] = useState(initialPublished);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={published ? "btn-secondary" : "btn-primary"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = !published;
            await setPublished(employeeId, next);
            setPub(next);
            router.refresh();
          })
        }
      >
        {pending ? "Saving…" : published ? "Unpublish" : "Publish"}
      </button>
      <button
        type="button"
        className="text-sm text-red-600 hover:text-red-700"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this AI employee? This cannot be undone.")) return;
          startTransition(async () => {
            await deleteEmployee(employeeId);
            router.push("/employees");
            router.refresh();
          });
        }}
      >
        Delete
      </button>
    </div>
  );
}
