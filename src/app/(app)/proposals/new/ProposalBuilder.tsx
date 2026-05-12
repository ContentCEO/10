"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";

interface LineItem { label: string; qty: number; unit_price_cents: number }
interface Tier { name: string; price_cents: number; summary: string; line_items: LineItem[] }

export function ProposalBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<"brief" | "review">("brief");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brief, setBrief] = useState("");
  const [service, setService] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [budgetHint, setBudgetHint] = useState("");

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [terms, setTerms] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [financingUrl, setFinancingUrl] = useState("");

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, service, customer_name: customerName, budget_hint: budgetHint }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      setTitle(data.title ?? "");
      setIntro(data.intro ?? "");
      setTerms(data.terms ?? "");
      setTiers(data.tiers ?? []);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, intro, terms, tiers,
          customer_email: customerEmail || undefined,
          customer_phone: customerPhone || undefined,
          financing_url: financingUrl || undefined,
          expires_in_days: 30,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      router.push(`/p/${data.proposal.share_token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateTier(idx: number, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  if (step === "brief") {
    return (
      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Customer name</label>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jane Smith" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Service type</label>
            <input className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Roof replacement, kitchen remodel…" />
          </div>
          <div>
            <label className="label">Budget hint <span className="text-ink-400">(optional)</span></label>
            <input className="input" value={budgetHint} onChange={(e) => setBudgetHint(e.target.value)} placeholder="~$15k, customer mentioned $20k cap" />
          </div>
        </div>
        <div>
          <label className="label">Scope / brief</label>
          <textarea className="input min-h-32" value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe the job: rooms, materials, special requirements. The more detail, the better the AI draft." />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Customer email <span className="text-ink-400">(optional)</span></label>
            <input className="input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="label">Customer phone <span className="text-ink-400">(optional)</span></label>
            <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} type="tel" placeholder="(555) 123-4567" />
          </div>
        </div>
        <div>
          <label className="label">Financing link <span className="text-ink-400">(optional — Hearth / Wisetack / GoodLeap)</span></label>
          <input className="input" value={financingUrl} onChange={(e) => setFinancingUrl(e.target.value)} placeholder="https://yourfinancingapp.com/apply" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={generate} disabled={generating || (!brief && !service)} className="btn-primary">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate 3 tiers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-3">
        <div>
          <label className="label">Proposal title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Intro</label>
          <textarea className="input min-h-20" value={intro} onChange={(e) => setIntro(e.target.value)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {tiers.map((t, i) => (
          <div key={i} className={`card p-5 space-y-3 ${i === 1 ? "ring-2 ring-brand-500" : ""}`}>
            {i === 1 && <span className="badge bg-brand-100 text-brand-700 ring-brand-200 text-[10px]">Most popular</span>}
            <input
              className="input !py-1.5 font-bold text-lg"
              value={t.name}
              onChange={(e) => updateTier(i, { name: e.target.value })}
            />
            <div>
              <label className="label text-xs">Price</label>
              <div className="flex items-center gap-1">
                <span className="text-ink-500">$</span>
                <input
                  type="number"
                  className="input !py-1.5 tabular-nums"
                  value={(t.price_cents / 100).toFixed(0)}
                  onChange={(e) => updateTier(i, { price_cents: Math.max(0, Number(e.target.value) * 100) })}
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Summary</label>
              <textarea
                className="input !py-1.5 text-sm min-h-16"
                value={t.summary}
                onChange={(e) => updateTier(i, { summary: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Line items ({t.line_items.length})</label>
              <ul className="space-y-1 text-xs">
                {t.line_items.map((li, j) => (
                  <li key={j} className="flex items-center gap-1.5">
                    <input
                      className="input !py-1 text-xs flex-1"
                      value={li.label}
                      onChange={(e) => {
                        const items = [...t.line_items];
                        items[j] = { ...li, label: e.target.value };
                        updateTier(i, { line_items: items });
                      }}
                    />
                    <input
                      type="number"
                      className="input !py-1 text-xs w-16 tabular-nums"
                      value={li.qty}
                      onChange={(e) => {
                        const items = [...t.line_items];
                        items[j] = { ...li, qty: Number(e.target.value) };
                        updateTier(i, { line_items: items });
                      }}
                    />
                    <input
                      type="number"
                      className="input !py-1 text-xs w-20 tabular-nums"
                      value={(li.unit_price_cents / 100).toFixed(0)}
                      onChange={(e) => {
                        const items = [...t.line_items];
                        items[j] = { ...li, unit_price_cents: Math.max(0, Number(e.target.value) * 100) };
                        updateTier(i, { line_items: items });
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <label className="label">Terms</label>
        <textarea className="input min-h-24" value={terms} onChange={(e) => setTerms(e.target.value)} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save + get share link
        </button>
        <button onClick={() => setStep("brief")} disabled={saving} className="btn-ghost text-sm">
          Back
        </button>
      </div>
    </div>
  );
}
