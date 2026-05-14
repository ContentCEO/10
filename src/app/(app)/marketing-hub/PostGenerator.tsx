"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📷", chars: 2200 },
  { id: "tiktok",    label: "TikTok",    emoji: "🎵", chars: 2200 },
  { id: "facebook",  label: "Facebook",  emoji: "📘", chars: 5000 },
  { id: "linkedin",  label: "LinkedIn",  emoji: "💼", chars: 3000 },
] as const;

type Platform = typeof PLATFORMS[number]["id"];

interface Variant {
  caption: string;
  hashtags: string[];
}

export function PostGenerator({
  businessName, defaultService, defaultCity,
}: {
  businessName: string;
  defaultService: string;
  defaultCity: string;
}) {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [service, setService] = useState(defaultService);
  const [city, setCity] = useState(defaultCity);
  const [angle, setAngle] = useState<"before_after" | "tip" | "testimonial" | "promo" | "behind_scenes">("before_after");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(null);
    try {
      const res = await fetch("/api/marketing/post-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, service, city, angle, businessName }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json() as { variants: Variant[] };
      setVariants(data.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PLATFORMS.map((pl) => (
          <button
            key={pl.id}
            onClick={() => setPlatform(pl.id)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              platform === pl.id
                ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
            }`}
          >
            <div className="text-lg">{pl.emoji}</div>
            <div>{pl.label}</div>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Service</label>
          <input className="input !py-2 text-sm" value={service} onChange={(e) => setService(e.target.value)} placeholder="roofing, painting…" />
        </div>
        <div>
          <label className="label text-xs">City</label>
          <input className="input !py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Boston, MA" />
        </div>
        <div>
          <label className="label text-xs">Angle</label>
          <select className="input !py-2 text-sm" value={angle} onChange={(e) => setAngle(e.target.value as typeof angle)}>
            <option value="before_after">Before / after</option>
            <option value="tip">Pro tip</option>
            <option value="testimonial">Customer testimonial</option>
            <option value="promo">Promotion / offer</option>
            <option value="behind_scenes">Behind the scenes</option>
          </select>
        </div>
      </div>

      <button onClick={generate} disabled={loading || !service} className="btn-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {variants.length > 0 ? "Regenerate 3 variants" : "Generate 3 variants"}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {variants.length > 0 && (
        <div className="space-y-3 pt-2">
          {variants.map((v, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-4 bg-ink-50/40">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Variant {i + 1}</span>
                <button
                  onClick={() => copy(`${v.caption}\n\n${v.hashtags.join(" ")}`, i)}
                  className="btn-secondary !py-1 !px-2 text-xs"
                >
                  <Copy className="h-3 w-3" /> {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm whitespace-pre-line leading-relaxed">{v.caption}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {v.hashtags.map((h) => (
                  <span key={h} className="badge bg-brand-50 text-brand-700 ring-brand-200 text-[11px]">{h}</span>
                ))}
              </div>
            </div>
          ))}
          <button onClick={generate} disabled={loading} className="btn-ghost text-xs">
            <RefreshCw className="h-3 w-3" /> Generate 3 more
          </button>
        </div>
      )}
    </div>
  );
}
