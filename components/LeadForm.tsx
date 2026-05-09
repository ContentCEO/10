"use client";

import { useState } from "react";

export function LeadForm({
  slug,
  apiBase = "",
  color = "#0070c4",
}: {
  slug: string;
  apiBase?: string;
  color?: string;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    address: "",
    timeline: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thanks! We&apos;ll be in touch shortly.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(v) => patch("name", v)} />
        <Input label="Phone" value={form.phone} onChange={(v) => patch("phone", v)} />
      </div>
      <Input label="Email" type="email" value={form.email} onChange={(v) => patch("email", v)} />
      <Input label="Service needed" value={form.service} onChange={(v) => patch("service", v)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Address" value={form.address} onChange={(v) => patch("address", v)} />
        <Input label="Timeline" value={form.timeline} onChange={(v) => patch("timeline", v)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: color }}
      >
        {status === "loading" ? "Sending…" : "Request callback"}
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
