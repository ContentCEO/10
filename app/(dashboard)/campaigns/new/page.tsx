"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignStep, Channel } from "@/lib/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [goal, setGoal] = useState("Re-engage cold leads and book a 15-minute call");
  const [tone, setTone] = useState("friendly, casual, professional");
  const [steps, setSteps] = useState<CampaignStep[]>([
    { delay_days: 0, channel: "email", prompt: "First touch: warm reintroduction, reference their interest." },
    { delay_days: 3, channel: "email", prompt: "Soft nudge: short bump asking if now is a better time." },
    { delay_days: 7, channel: "sms", prompt: "Final nudge: brief SMS asking yes/no on a quick call." },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateStep(idx: number, patch: Partial<CampaignStep>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addStep() {
    setSteps((p) => [...p, { delay_days: 1, channel, prompt: "" }]);
  }
  function removeStep(idx: number) {
    setSteps((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, channel, goal, tone, steps }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create");
      return;
    }
    router.push("/campaigns");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <h1 className="text-2xl font-semibold">New campaign</h1>
      <p className="text-sm text-slate-600 mt-1">Define the sequence; steps drive AI message prompts.</p>

      <div className="mt-6 card p-6 space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 dormant reactivation" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Primary channel</label>
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="label">Tone</label>
            <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Goal</label>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Sequence</h2>
        <div className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Step {i + 1}</span>
                <button type="button" className="text-xs text-rose-600" onClick={() => removeStep(i)}>Remove</button>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="label">Delay (days)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={s.delay_days}
                    onChange={(e) => updateStep(i, { delay_days: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Channel</label>
                  <select
                    className="input"
                    value={s.channel}
                    onChange={(e) => updateStep(i, { channel: e.target.value as Channel })}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="label">Prompt</label>
                <textarea
                  className="input"
                  rows={2}
                  value={s.prompt}
                  onChange={(e) => updateStep(i, { prompt: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addStep}>+ Add step</button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}
      <div className="mt-6 flex gap-2">
        <button className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Create campaign"}</button>
      </div>
    </form>
  );
}
