"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RequestActions({
  requestId,
  customerId,
  status
}: {
  requestId: string;
  customerId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [technician, setTechnician] = useState("");

  async function update(newStatus: string) {
    startTransition(async () => {
      await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      router.refresh();
    });
  }

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await fetch(`/api/admin/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service_request_id: requestId,
          customer_id: customerId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          technician_name: technician || null
        })
      });
      setShowSchedule(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "submitted" && (
        <button className="btn-secondary text-xs" onClick={() => setShowSchedule(true)} disabled={pending}>
          Schedule
        </button>
      )}
      {status === "scheduled" && (
        <button className="btn-secondary text-xs" onClick={() => update("in_progress")} disabled={pending}>
          Start
        </button>
      )}
      {status === "in_progress" && (
        <button className="btn-secondary text-xs" onClick={() => update("completed")} disabled={pending}>
          Complete
        </button>
      )}
      {!["completed", "canceled"].includes(status) && (
        <button className="text-xs text-rose-600 hover:underline" onClick={() => update("canceled")} disabled={pending}>
          Cancel
        </button>
      )}

      {showSchedule && (
        <form onSubmit={schedule} className="mt-2 flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-2">
          <input
            type="datetime-local"
            required
            className="input text-xs"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <input
            type="text"
            placeholder="Technician (optional)"
            className="input text-xs"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="text-xs text-slate-500" onClick={() => setShowSchedule(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs" disabled={pending}>
              Book
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
