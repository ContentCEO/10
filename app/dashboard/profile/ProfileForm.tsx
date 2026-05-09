"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BusinessProfile } from "@/lib/types";

const TONES = ["friendly", "professional", "playful", "luxury", "bold", "warm"];

export default function ProfileForm({ initial }: { initial: BusinessProfile | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    business_name: initial?.business_name ?? "",
    business_type: initial?.business_type ?? "",
    services: (initial?.services ?? []).join(", "),
    city: initial?.city ?? "",
    region: initial?.region ?? "",
    brand_tone: initial?.brand_tone ?? "friendly",
    target_audience: initial?.target_audience ?? "",
    unique_selling_points: initial?.unique_selling_points ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      business_name: form.business_name,
      business_type: form.business_type,
      services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      city: form.city || null,
      region: form.region || null,
      brand_tone: form.brand_tone,
      target_audience: form.target_audience || null,
      unique_selling_points: form.unique_selling_points || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("business_profiles")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Saved.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Business name</label>
          <input className="input" required value={form.business_name}
            onChange={(e) => set("business_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Business type</label>
          <input className="input" required placeholder="e.g. dental clinic"
            value={form.business_type}
            onChange={(e) => set("business_type", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Services (comma separated)</label>
        <input className="input" placeholder="e.g. teeth whitening, invisalign, cleanings"
          value={form.services} onChange={(e) => set("services", e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city}
            onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className="label">Region / state</label>
          <input className="input" value={form.region}
            onChange={(e) => set("region", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Brand tone</label>
          <select className="input" value={form.brand_tone}
            onChange={(e) => set("brand_tone", e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Target audience</label>
          <input className="input" placeholder="e.g. young professionals 25-40"
            value={form.target_audience}
            onChange={(e) => set("target_audience", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">What makes you different?</label>
        <textarea className="input min-h-[80px]"
          placeholder="USPs, awards, specialties — anything that should show up in posts"
          value={form.unique_selling_points}
          onChange={(e) => set("unique_selling_points", e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </form>
  );
}
