"use client";

import { useState } from "react";
import { Copy, Loader2, Search } from "lucide-react";

interface HashtagBlock {
  platform: string;
  tags: string[];
}

export function HashtagFinder({
  defaultService, defaultCity,
}: {
  defaultService: string;
  defaultCity: string;
}) {
  const [service, setService] = useState(defaultService);
  const [city, setCity] = useState(defaultCity);
  const [results, setResults] = useState<HashtagBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, city }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json() as { results: HashtagBlock[] };
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function copyAll(tags: string[], platform: string) {
    navigator.clipboard.writeText(tags.join(" ")).then(() => {
      setCopied(platform);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
        <input className="input !py-2 text-sm" value={service} onChange={(e) => setService(e.target.value)} placeholder="Service (e.g. roofing)" />
        <input className="input !py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" />
        <button onClick={find} disabled={loading || !service} className="btn-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Find tags
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.platform} className="rounded-xl border border-ink-200 p-4 bg-ink-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">{r.platform}</span>
                <button
                  onClick={() => copyAll(r.tags, r.platform)}
                  className="btn-secondary !py-1 !px-2 text-xs"
                >
                  <Copy className="h-3 w-3" /> {copied === r.platform ? "Copied" : "Copy all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.tags.map((t) => (
                  <span key={t} className="badge bg-white text-ink-700 ring-ink-200 text-[11px] cursor-pointer hover:bg-brand-50 hover:ring-brand-200" onClick={() => copyAll([t], t)}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
