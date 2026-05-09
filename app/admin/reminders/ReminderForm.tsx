"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; label: string };

export default function ReminderForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          title,
          body,
          send_at: new Date(sendAt).toISOString(),
          channel
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not create reminder.");
        return;
      }
      setTitle(""); setBody(""); setSendAt("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Customer</label>
        <select className="select" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Send at</label>
        <input type="datetime-local" required className="input" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Title</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Body</label>
        <textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div>
        <label className="label">Channel</label>
        <select className="select" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="both">Both</option>
        </select>
      </div>
      {error && <p className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Schedule reminder"}
        </button>
      </div>
    </form>
  );
}
