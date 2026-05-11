"use client";

import { useState } from "react";
import { ArrowRight, Image as ImageIcon, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";

interface Result {
  low: number | null;
  high: number | null;
  summary: string;
  factors: string[];
  caveats: string[];
}

function money(n: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function EstimatorForm() {
  const [service, setService] = useState("");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoDraft, setPhotoDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function addPhoto() {
    const u = photoDraft.trim();
    if (!u) return;
    if (photoUrls.length >= 5) return;
    setPhotoUrls([...photoUrls, u]);
    setPhotoDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service.trim()) { setError("Tell us what kind of project."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: service,
          details,
          city,
          zip,
          photo_urls: photoUrls,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not estimate");
      setResult(body as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="service">Project type</label>
          <input id="service" required className="input"
            placeholder="Kitchen remodel, deck build, roof repair, deep clean…"
            value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="details">Details</label>
          <textarea id="details" rows={4} className="input"
            placeholder="Square footage, current condition, materials you have in mind, must-haves…"
            value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" className="input" autoComplete="address-level2"
              value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="zip">ZIP</label>
            <input id="zip" className="input" inputMode="numeric" autoComplete="postal-code"
              value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Photos (optional)
          </label>
          <div className="flex gap-2">
            <input type="url" className="input" placeholder="Paste an image URL"
              value={photoDraft}
              onChange={(e) => setPhotoDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhoto(); } }}
            />
            <button type="button" onClick={addPhoto}
              disabled={!photoDraft.trim() || photoUrls.length >= 5}
              className="btn-secondary shrink-0">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Up to 5 photos. Easiest: upload to Imgur and paste the direct image URL.
            Skip if you'd rather just describe it.
          </p>
          {photoUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photoUrls.map((u, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={u} alt="" className="w-full h-20 object-cover" />
                  <button type="button"
                    onClick={() => setPhotoUrls(photoUrls.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-md bg-black/60 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn-primary w-full text-base py-3" disabled={loading}>
          <Sparkles className="h-4 w-4" />
          {loading ? "Estimating…" : "Get my estimate"}
        </button>
      </form>

      {result && (
        <div className="card p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Estimated range</div>
            <div className="mt-1 text-4xl font-bold gradient-text">
              {money(result.low)} – {money(result.high)}
            </div>
          </div>
          {result.summary && <p className="text-sm text-slate-700">{result.summary}</p>}

          {result.factors.length > 0 && (
            <div>
              <div className="font-semibold text-sm">What moves the price</div>
              <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-0.5">
                {result.factors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {result.caveats.length > 0 && (
            <div>
              <div className="font-semibold text-sm">Important caveats</div>
              <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-0.5">
                {result.caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          <Link href="/find-pro" className="btn-primary mt-2">
            Get a real quote from a pro <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
