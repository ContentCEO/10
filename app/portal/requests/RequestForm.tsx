"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Plumbing", "Electrical", "HVAC", "Carpentry", "Painting", "Outdoor", "Other"];

export default function RequestForm({ defaultAddress }: { defaultAddress: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [address, setAddress] = useState(defaultAddress);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          preferred_date: preferredDate || null,
          preferred_time_window: timeWindow || null,
          address: address || null
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not submit request.");
        return;
      }
      setTitle(""); setDescription(""); setPreferredDate(""); setTimeWindow("");
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">What do you need fixed?</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leaky faucet in kitchen" />
      </div>
      <div>
        <label className="label">Category</label>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Priority</label>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label className="label">Preferred date</label>
        <input type="date" className="input" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Preferred time</label>
        <input className="input" placeholder="Morning, afternoon, after 5…" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Address</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Details</label>
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
      {done && <p className="sm:col-span-2 text-sm text-emerald-700">✅ Request submitted! We'll be in touch shortly.</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
