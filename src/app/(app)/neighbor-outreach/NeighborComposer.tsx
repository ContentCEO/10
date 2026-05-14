"use client";

import { useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";

export function NeighborComposer({
  businessName, defaultService,
}: { businessName: string; defaultService: string }) {
  const [service, setService] = useState(defaultService);
  const [neighborhood, setNeighborhood] = useState("");
  const [offer, setOffer] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/post-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "facebook",
          service,
          city: neighborhood,
          angle: "promo",
          businessName: businessName + (offer ? ` (offer: ${offer})` : ""),
        }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json() as { variants?: { caption: string }[] };
      setVariants((data.variants ?? []).map((v) => v.caption));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Service just completed</label>
          <input className="input !py-2 text-sm" value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Neighborhood / town</label>
          <input className="input !py-2 text-sm" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Brookline, Newton…" />
        </div>
        <div>
          <label className="label text-xs">Offer <span className="text-ink-400">(optional)</span></label>
          <input className="input !py-2 text-sm" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Free estimate, 10% off" />
        </div>
      </div>
      <button onClick={generate} disabled={loading} className="btn-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate 3 postcard messages
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {variants.length > 0 && (
        <div className="space-y-3 pt-2">
          {variants.map((v, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-4 bg-ink-50/40">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Variant {i + 1}</span>
                <button onClick={() => copy(v, i)} className="btn-secondary !py-1 !px-2 text-xs">
                  <Copy className="h-3 w-3" /> {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm whitespace-pre-line leading-relaxed">{v}</p>
            </div>
          ))}
          <p className="text-xs text-ink-500 italic">
            Send via direct mail: Lob, PostalMail, or local print shop. Recommended: 5.5×8.5&quot; postcard, full color, glossy.
          </p>
        </div>
      )}
    </div>
  );
}
