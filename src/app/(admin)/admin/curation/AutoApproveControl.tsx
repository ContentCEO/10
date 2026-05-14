"use client";

import { useState } from "react";
import { Bot, Save } from "lucide-react";

export function AutoApproveControl({ initialThreshold }: { initialThreshold: number }) {
  const [value, setValue] = useState(initialThreshold);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/curation/auto-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: value }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">
          <Bot className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold tracking-tight">Auto-approve high-score leads</h3>
          <p className="text-sm text-ink-600 mt-0.5">
            Scraped leads with AI score ≥ this threshold skip curation and go
            straight to the marketplace. Set to <strong>0</strong> to disable
            and review everything manually.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-48 accent-brand-600"
              />
              <span className="font-bold tabular-nums w-12 text-center text-lg gradient-text">
                {value === 0 ? "off" : `${value}+`}
              </span>
            </div>
            <button onClick={save} disabled={saving} className="btn-primary !py-1.5 text-sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
