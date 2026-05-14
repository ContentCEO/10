"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";

export function PhotoAdder({ defaultService, defaultCity }: { defaultService: string; defaultCity: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"before" | "after" | "progress" | "other">("after");
  const [caption, setCaption] = useState("");
  const [service, setService] = useState(defaultService);
  const [city, setCity] = useState(defaultCity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!url) { setError("URL required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content/photo-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind, caption, service, city }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setUrl(""); setCaption("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid sm:grid-cols-[1fr_140px] gap-3">
        <input className="input !py-2 text-sm" placeholder="Image URL (Imgur, Drive, S3, etc.)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select className="input !py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="after">After</option>
          <option value="before">Before</option>
          <option value="progress">Progress</option>
          <option value="other">Other</option>
        </select>
      </div>
      <input className="input !py-2 text-sm" placeholder="Caption / context (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input !py-2 text-sm" placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} />
        <input className="input !py-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <button onClick={save} disabled={saving || !url} className="btn-primary">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Add photo
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <p className="text-xs text-ink-500">
        For uploads: drop the image in <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-brand-600 underline">Imgur</a>,
        right-click the uploaded image → &ldquo;Copy image address&rdquo; → paste here. Or use Google Drive (share link, set to anyone with link).
      </p>
    </div>
  );
}
