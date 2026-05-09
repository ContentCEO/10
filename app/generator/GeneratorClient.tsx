"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdCreative, Business, CampaignStructure } from "@/lib/types";
import { CreativeCard } from "@/components/CreativeCard";
import { CampaignStructureCard } from "@/components/CampaignStructureCard";

type FormState = {
  businessId: string;
  productName: string;
  productDescription: string;
  productPrice: string;
  productFeatures: string;
  productBenefits: string;
  productPainPoints: string;
  offerHeadline: string;
  offerDetails: string;
  offerCta: string;
  offerGuarantee: string;
  offerUrgency: string;
  offerBonus: string;
  objective: string;
  numVariants: number;
  campaignName: string;
};

const DEFAULTS: FormState = {
  businessId: "",
  productName: "",
  productDescription: "",
  productPrice: "",
  productFeatures: "",
  productBenefits: "",
  productPainPoints: "",
  offerHeadline: "",
  offerDetails: "",
  offerCta: "Shop Now",
  offerGuarantee: "",
  offerUrgency: "",
  offerBonus: "",
  objective: "conversions",
  numVariants: 4,
  campaignName: "",
};

export function GeneratorClient({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...DEFAULTS, businessId: businesses[0]?.id ?? "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<AdCreative[] | null>(null);
  const [structure, setStructure] = useState<CampaignStructure | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatives(null);
    setStructure(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Generation failed");
      setCreatives(j.creatives);
      setStructure(j.campaign_structure);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveCampaign() {
    if (!creatives || !structure) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: form.businessId,
          name: form.campaignName || form.productName || "Untitled campaign",
          objective: form.objective,
          product: {
            name: form.productName,
            description: form.productDescription,
            price: form.productPrice,
            features: form.productFeatures,
            benefits: form.productBenefits,
            pain_points: form.productPainPoints,
          },
          offer: {
            headline: form.offerHeadline,
            details: form.offerDetails,
            cta: form.offerCta,
            guarantee: form.offerGuarantee,
            urgency: form.offerUrgency,
            bonus: form.offerBonus,
          },
          structure,
          creatives,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      router.push(`/dashboard/campaigns/${j.campaign.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={generate} className="card space-y-4">
        <div>
          <label className="label">Business</label>
          <select
            className="input"
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide pt-2">Product / Service</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Price</label>
            <input
              className="input"
              placeholder="$99 / mo"
              value={form.productPrice}
              onChange={(e) => update("productPrice", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={form.productDescription}
            onChange={(e) => update("productDescription", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Features (one per line)</label>
          <textarea
            className="input"
            rows={2}
            value={form.productFeatures}
            onChange={(e) => update("productFeatures", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Benefits</label>
          <textarea
            className="input"
            rows={2}
            value={form.productBenefits}
            onChange={(e) => update("productBenefits", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Pain points it solves</label>
          <textarea
            className="input"
            rows={2}
            value={form.productPainPoints}
            onChange={(e) => update("productPainPoints", e.target.value)}
          />
        </div>

        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide pt-2">Offer</h3>
        <div>
          <label className="label">Offer headline</label>
          <input
            className="input"
            required
            placeholder="50% off your first month"
            value={form.offerHeadline}
            onChange={(e) => update("offerHeadline", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Offer details</label>
          <textarea
            className="input"
            rows={2}
            value={form.offerDetails}
            onChange={(e) => update("offerDetails", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">CTA</label>
            <select
              className="input"
              value={form.offerCta}
              onChange={(e) => update("offerCta", e.target.value)}
            >
              {["Shop Now","Learn More","Sign Up","Get Offer","Book Now","Subscribe","Download"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Urgency</label>
            <input
              className="input"
              placeholder="Ends Sunday"
              value={form.offerUrgency}
              onChange={(e) => update("offerUrgency", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Guarantee</label>
            <input
              className="input"
              placeholder="30-day money back"
              value={form.offerGuarantee}
              onChange={(e) => update("offerGuarantee", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Bonus</label>
            <input
              className="input"
              value={form.offerBonus}
              onChange={(e) => update("offerBonus", e.target.value)}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide pt-2">Campaign</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Objective</label>
            <select
              className="input"
              value={form.objective}
              onChange={(e) => update("objective", e.target.value)}
            >
              {["conversions","leads","traffic","awareness","engagement","app_installs"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Variants</label>
            <select
              className="input"
              value={form.numVariants}
              onChange={(e) => update("numVariants", Number(e.target.value))}
            >
              {[2,3,4,5,6,8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Campaign name (optional)</label>
          <input
            className="input"
            value={form.campaignName}
            onChange={(e) => update("campaignName", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Generating…" : "Generate ads"}
        </button>
      </form>

      <div className="space-y-4">
        {!creatives && !loading && (
          <div className="card text-zinc-500 text-sm">
            Your generated creatives and campaign plan will appear here.
          </div>
        )}
        {loading && (
          <div className="card animate-pulse text-zinc-500 text-sm">
            Writing ads…
          </div>
        )}
        {structure && <CampaignStructureCard structure={structure} />}
        {creatives && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{creatives.length} variants</h2>
              <button onClick={saveCampaign} disabled={saving} className="btn-secondary">
                {saving ? "Saving…" : "Save campaign"}
              </button>
            </div>
            {creatives.map((c, i) => <CreativeCard key={i} creative={c} />)}
          </>
        )}
      </div>
    </div>
  );
}
