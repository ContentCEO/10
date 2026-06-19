"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";

interface Initial {
  hic_number: string;
  csl_number: string;
  insurance_carrier: string;
  insurance_policy: string;
  insurance_expiry: string;
}

export function VerificationForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Submission failed.");
      }
    });
  };

  const set = (k: keyof Initial) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <form onSubmit={onSubmit} className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
        Submit for review
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="MA HIC registration #" required value={form.hic_number} onChange={set("hic_number")}
          help="Required for all MA contractors. We verify against the OCABR registry." />
        <Field label="MA CSL # (optional)" value={form.csl_number} onChange={set("csl_number")}
          help="Construction Supervisor License — required for structural work." />
        <Field label="Insurance carrier" required value={form.insurance_carrier} onChange={set("insurance_carrier")} />
        <Field label="Policy # (optional)" value={form.insurance_policy} onChange={set("insurance_policy")} />
        <Field label="Insurance expiry" required type="date" value={form.insurance_expiry} onChange={set("insurance_expiry")}
          help="Must be in the future. We'll nudge you at 30 + 7 days before expiry." />
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          By submitting you confirm these documents are current and accurate.
        </div>
        <button disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--emerald-bright), var(--emerald-deep))" }}>
          <Send className="h-4 w-4" />
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, required, type = "text", help }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; help?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-1 text-xs font-semibold mb-1.5" style={{ color: "var(--text)" }}>
        {label}
        {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </div>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)" }} />
      {help && <div className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>{help}</div>}
    </label>
  );
}
