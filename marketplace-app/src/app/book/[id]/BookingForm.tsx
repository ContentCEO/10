"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Slot {
  id: string;
  start_at: string;
}

export function BookingForm({
  contractorId,
  slotsByDay,
}: {
  contractorId: string;
  slotsByDay: Record<string, Slot[]>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selected,
          contractor_id: contractorId,
          name, phone, email, service, notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Booking failed");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 text-center space-y-3">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="text-lg font-semibold">You're booked.</h2>
        <p className="text-sm text-slate-600">
          They'll reach out to confirm. Check your phone or email for next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="label">Pick a time</label>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {Object.entries(slotsByDay).map(([day, slots]) => (
            <div key={day}>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{day}</div>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => {
                  const time = new Date(s.start_at).toLocaleTimeString("en-US", {
                    hour: "numeric", minute: "2-digit",
                  });
                  return (
                    <button
                      key={s.id} type="button"
                      onClick={() => setSelected(s.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        selected === s.id
                          ? "bg-brand-gradient text-white border-transparent shadow-glow"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" required className="input"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" type="tel" className="input"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="service">What kind of project?</label>
            <input id="service" className="input"
              placeholder="Kitchen remodel, roof repair…"
              value={service} onChange={(e) => setService(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" rows={2} className="input"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Booking…" : "Confirm booking"}
          </button>
        </>
      )}
    </form>
  );
}
