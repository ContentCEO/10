"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, X } from "lucide-react";
import type { JobPhoto } from "@/lib/types";

const PHASE_LABELS: Record<string, string> = {
  before: "Before",
  during: "During",
  after:  "After",
};

export function JobPhotos({ jobId, photos }: { jobId: string; photos: JobPhoto[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [phase, setPhase] = useState<"before" | "during" | "after" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), caption: caption.trim() || null, phase: phase || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to add photo");
      }
      setUrl(""); setCaption(""); setPhase("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function remove(photoId: string) {
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/photos?id=${photoId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Failed to remove");
      return;
    }
    router.refresh();
  }

  const grouped = {
    before: photos.filter((p) => p.phase === "before"),
    during: photos.filter((p) => p.phase === "during"),
    after:  photos.filter((p) => p.phase === "after"),
    other:  photos.filter((p) => !p.phase),
  };

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold">Job photos</h2>
        <span className="text-xs text-slate-500 ml-auto">{photos.length} total</span>
      </div>

      {([["before", "Before"], ["during", "During"], ["after", "After"], ["other", "Other"]] as const).map(
        ([key, label]) => {
          const arr = (grouped as Record<string, JobPhoto[]>)[key];
          if (arr.length === 0) return null;
          return (
            <div key={key}>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{label}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {arr.map((ph) => (
                  <div key={ph.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                    <img src={ph.url} alt={ph.caption ?? ""} className="w-full h-32 object-cover" />
                    {ph.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-xs px-2 py-1 truncate">
                        {ph.caption}
                      </div>
                    )}
                    <button
                      onClick={() => remove(ph.id)}
                      className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        },
      )}

      <form onSubmit={add} className="grid sm:grid-cols-[2fr_1fr_auto_auto] gap-2 pt-3 border-t border-slate-100">
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          type="url" required className="input" placeholder="Image URL (Imgur, your site, etc.)" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)}
          className="input" placeholder="Caption" />
        <select value={phase} onChange={(e) => setPhase(e.target.value as "before" | "during" | "after" | "")} className="input">
          <option value="">Phase</option>
          <option value="before">Before</option>
          <option value="during">During</option>
          <option value="after">After</option>
        </select>
        <button className="btn-primary" disabled={loading}>{loading ? "…" : "Add"}</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {photos.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          Document before/after work for client peace of mind and your portfolio. Crew on
          your team can also upload from the field.
        </p>
      )}
    </section>
  );
}
