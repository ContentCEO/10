"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [street, setStreet] = useState(profile.street ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [postal, setPostal] = useState(profile.postal_code ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          street,
          city,
          state,
          postal_code: postal
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Full name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input bg-slate-100" value={profile.email} disabled />
      </div>
      <div>
        <label className="label">Phone (for SMS)</label>
        <input className="input" placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Street</label>
        <input className="input" value={street} onChange={(e) => setStreet(e.target.value)} />
      </div>
      <div>
        <label className="label">City</label>
        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div>
        <label className="label">State</label>
        <input className="input" value={state} onChange={(e) => setState(e.target.value)} />
      </div>
      <div>
        <label className="label">Postal code</label>
        <input className="input" value={postal} onChange={(e) => setPostal(e.target.value)} />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
      {saved && <p className="sm:col-span-2 text-sm text-emerald-700">Saved.</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
