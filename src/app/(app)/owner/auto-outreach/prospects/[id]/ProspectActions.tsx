"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Sparkles, Send, ExternalLink, Rocket } from "lucide-react";

interface Props {
  prospectId: string;
  hasScan: boolean;
  hasSite: boolean;
  previewUrl: string | null;
  canEmail: boolean;
  canSms: boolean;
  dnc: boolean;
}

export function ProspectActions(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(endpoint: string, body: object, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => call("/api/auto-outreach/scan", { prospectId: p.prospectId }, "scan")}
        disabled={!!busy}
        className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        <Activity className="h-4 w-4" /> {busy === "scan" ? "Scanning…" : "Run Scan"}
      </button>
      <button
        onClick={() => call("/api/auto-outreach/generate", { prospectId: p.prospectId }, "gen")}
        disabled={!!busy || !p.hasScan}
        title={!p.hasScan ? "Run scan first" : ""}
        className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" /> {busy === "gen" ? "Generating…" : "Generate Site + Ads"}
      </button>
      {p.previewUrl && (
        <a
          href={p.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" /> Preview
        </a>
      )}
      <button
        onClick={() => call("/api/auto-outreach/outreach", { prospectId: p.prospectId, channel: "email" }, "email")}
        disabled={!!busy || !p.hasSite || !p.canEmail || p.dnc}
        title={!p.hasSite ? "Generate site first" : !p.canEmail ? "No email on file" : p.dnc ? "Do not contact" : ""}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-40"
      >
        <Send className="h-4 w-4" /> {busy === "email" ? "Sending…" : "Send Email"}
      </button>
      <button
        onClick={() => call("/api/auto-outreach/outreach", { prospectId: p.prospectId, channel: "sms" }, "sms")}
        disabled={!!busy || !p.hasSite || !p.canSms || p.dnc}
        title={!p.hasSite ? "Generate site first" : !p.canSms ? "No phone on file" : p.dnc ? "Do not contact" : ""}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-semibold disabled:opacity-40"
      >
        <Send className="h-4 w-4" /> {busy === "sms" ? "Sending…" : "Send SMS"}
      </button>
      <button
        onClick={() => call("/api/auto-outreach/pipeline", { prospectId: p.prospectId, channel: "email" }, "all")}
        disabled={!!busy || p.dnc}
        title={p.dnc ? "Do not contact" : "Scan → Generate → Email in one go"}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold shadow-glow disabled:opacity-40"
      >
        <Rocket className="h-4 w-4" /> {busy === "all" ? "Running…" : "Run Full Pipeline"}
      </button>
      {error && <div className="basis-full text-xs text-red-400">{error}</div>}
    </div>
  );
}
