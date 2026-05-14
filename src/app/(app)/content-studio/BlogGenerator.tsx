"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileText, Loader2 } from "lucide-react";

export function BlogGenerator({ defaultService, defaultCity }: { defaultService: string; defaultCity: string }) {
  const router = useRouter();
  const [service, setService] = useState(defaultService);
  const [city, setCity] = useState(defaultCity);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; body_md: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/blog-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, city, keyword }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      setResult({ title: data.title, body_md: data.body_md });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function copyMd() {
    if (!result) return;
    navigator.clipboard.writeText(`# ${result.title}\n\n${result.body_md}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="input !py-2 text-sm" placeholder="Service (e.g. roofing)" value={service} onChange={(e) => setService(e.target.value)} />
        <input className="input !py-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="input !py-2 text-sm" placeholder="Target keyword (optional)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>
      <button onClick={generate} disabled={loading || !service} className="btn-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Generate post
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {result && (
        <div className="rounded-xl border border-ink-200 p-4 bg-ink-50/40 mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-semibold tracking-tight">{result.title}</h3>
            <button onClick={copyMd} className="btn-secondary !py-1 !px-2 text-xs">
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy Markdown"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-ink-700 max-h-96 overflow-y-auto">{result.body_md}</pre>
        </div>
      )}
    </div>
  );
}
