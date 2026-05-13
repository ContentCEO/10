"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Instagram, Loader2, Sparkles, Video } from "lucide-react";

type Kind = "instagram_caption" | "tiktok_script";
type Tone = "friendly" | "casual" | "formal" | "direct";

export function CaptionGenerator({
  initialServices, initialTone,
}: { initialServices: string[]; initialTone: Tone }) {
  const [kind, setKind] = useState<Kind>("instagram_caption");
  const [service, setService] = useState(initialServices[0] ?? "");
  const [city, setCity]       = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone] = useState<Tone>(initialTone);
  const [output, setOutput] = useState("");
  const [source, setSource] = useState<"claude" | "template" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setOutput("");
    setSource(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/social-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind, tone, service, city, job_title: jobTitle,
            key_points: keyPoints.split("\n").map((s) => s.trim()).filter(Boolean),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        setOutput(String(data.output ?? ""));
        setSource(data.source ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Marketing · AI Tools</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Social caption + script generator</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Drop in a job, pick a tone, get an Instagram caption with hashtags or a 30-second TikTok script.
            Uses Claude when configured, falls back to proven templates.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setKind("instagram_caption")}
              className={
                kind === "instagram_caption"
                  ? "p-3 rounded-xl ring-2 ring-brand-500 bg-brand-50/40 flex items-center gap-2 font-semibold text-sm"
                  : "p-3 rounded-xl ring-1 ring-ink-200 bg-white hover:bg-ink-50 flex items-center gap-2 text-sm"
              }
            >
              <Instagram className="h-4 w-4" /> Instagram caption
            </button>
            <button
              onClick={() => setKind("tiktok_script")}
              className={
                kind === "tiktok_script"
                  ? "p-3 rounded-xl ring-2 ring-brand-500 bg-brand-50/40 flex items-center gap-2 font-semibold text-sm"
                  : "p-3 rounded-xl ring-1 ring-ink-200 bg-white hover:bg-ink-50 flex items-center gap-2 text-sm"
              }
            >
              <Video className="h-4 w-4" /> TikTok script
            </button>
          </div>

          <div>
            <label className="label" htmlFor="service">Service</label>
            <input id="service" className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Bathroom remodel" list="services-list" />
            {initialServices.length > 0 && (
              <datalist id="services-list">
                {initialServices.map((s) => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Brookline" />
            </div>
            <div>
              <label className="label" htmlFor="jobTitle">Job title (optional)</label>
              <input id="jobTitle" className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Master bath gut + tile" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="keyPoints">Key points (one per line)</label>
            <textarea
              id="keyPoints"
              rows={4}
              className="input min-h-[100px]"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder={"Heated floors\nDouble vanity\nWaterproofed correctly"}
            />
          </div>
          <div>
            <div className="label">Tone</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["friendly", "casual", "formal", "direct"] as Tone[]).map((t) => (
                <label
                  key={t}
                  className={
                    tone === t
                      ? "block p-2 rounded-lg cursor-pointer ring-2 ring-brand-500 bg-brand-50/40 text-xs font-semibold text-center capitalize"
                      : "block p-2 rounded-lg cursor-pointer ring-1 ring-ink-200 bg-white hover:bg-ink-50 text-xs text-center capitalize"
                  }
                >
                  <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={pending} className="btn-primary w-full justify-center">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </button>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs section-eyebrow">Output</div>
            {source && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
                {source === "claude" ? "Claude AI" : "Template fallback"}
              </span>
            )}
          </div>
          {error && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3 text-sm text-rose-800 mb-3">{error}</div>
          )}
          {!output && !error && (
            <div className="text-sm text-ink-500 py-12 text-center">Fill in the form and click Generate.</div>
          )}
          {output && (
            <>
              <pre className="whitespace-pre-wrap text-sm text-ink-800 font-sans leading-relaxed bg-ink-50 rounded-xl p-4 ring-1 ring-ink-200">{output}</pre>
              <button onClick={copy} className="btn-primary mt-3 w-full justify-center">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
