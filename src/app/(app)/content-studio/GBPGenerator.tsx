"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Globe, Loader2 } from "lucide-react";

const KINDS = [
  { id: "update", label: "Update" },
  { id: "offer",  label: "Offer / promo" },
  { id: "event",  label: "Event" },
  { id: "product",label: "Service / product" },
] as const;

export function GBPGenerator({ defaultService, defaultCity }: { defaultService: string; defaultCity: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<typeof KINDS[number]["id"]>("update");
  const [service, setService] = useState(defaultService);
  const [city, setCity] = useState(defaultCity);
  const [topic, setTopic] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string | null; body: string; cta_label: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/gbp-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, service, city, topic, cta_url: ctaUrl }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      setResult({ title: data.title, body: data.body, cta_label: data.cta_label });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    if (!result) return;
    const text = [result.title, result.body, result.cta_label].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {KINDS.map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            kind === k.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
          }`}>{k.label}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input !py-2 text-sm" placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} />
        <input className="input !py-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <input className="input !py-2 text-sm" placeholder="Topic / message (e.g. 'spring booking sale, 10% off')" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <input className="input !py-2 text-sm" placeholder="CTA URL (optional)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
      <button onClick={generate} disabled={loading || (!topic && !service)} className="btn-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        Draft GBP post
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {result && (
        <div className="rounded-xl border border-ink-200 p-4 bg-ink-50/40 mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 text-[10px]">{kind}</span>
            <button onClick={copyAll} className="btn-secondary !py-1 !px-2 text-xs">
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy all"}
            </button>
          </div>
          {result.title && <div className="font-semibold tracking-tight">{result.title}</div>}
          <p className="mt-2 text-sm text-ink-700 whitespace-pre-line leading-relaxed">{result.body}</p>
          {result.cta_label && <div className="mt-2 text-xs text-brand-600 font-medium">CTA: {result.cta_label}</div>}
        </div>
      )}
    </div>
  );
}
