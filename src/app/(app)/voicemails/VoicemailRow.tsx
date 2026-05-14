"use client";

import { useState } from "react";
import { Archive, Check, Loader2, Phone, PlayCircle, Send, Sparkles } from "lucide-react";

interface Voicemail {
  id: string;
  from_phone: string;
  recording_url: string | null;
  duration_sec: number | null;
  transcription: string | null;
  ai_summary: string | null;
  ai_suggested_reply: string | null;
  status: "new" | "replied" | "archived";
  created_at: string;
}

function formatDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export function VoicemailRow({ vm }: { vm: Voicemail }) {
  const [summary, setSummary] = useState(vm.ai_summary);
  const [reply, setReply] = useState(vm.ai_suggested_reply ?? "");
  const [status, setStatus] = useState(vm.status);
  const [busy, setBusy] = useState<"summarize" | "send" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function summarize() {
    setBusy("summarize");
    setError(null);
    try {
      const res = await fetch("/api/voice/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vm.id }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json() as { summary: string; suggested_reply: string };
      setSummary(data.summary);
      setReply(data.suggested_reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendReply() {
    setBusy("send");
    setError(null);
    try {
      const res = await fetch("/api/voice/send-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vm.id, body: reply }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setSent(true);
      setStatus("replied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    setBusy("archive");
    setError(null);
    try {
      const res = await fetch("/api/voice/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vm.id }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setStatus("archived");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (status === "archived") return null;

  return (
    <li className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-600" />
            <span className="font-semibold tracking-tight">{vm.from_phone}</span>
            {status === "replied" && (
              <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 text-[10px]">Replied</span>
            )}
            {status === "new" && (
              <span className="badge bg-brand-100 text-brand-700 ring-brand-200 text-[10px]">New</span>
            )}
          </div>
          <div className="text-xs text-ink-500 mt-0.5">
            {formatDuration(vm.duration_sec)} · {new Date(vm.created_at).toLocaleString()}
          </div>
        </div>
        {vm.recording_url && (
          <a href={vm.recording_url} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 text-xs">
            <PlayCircle className="h-3.5 w-3.5" /> Play
          </a>
        )}
      </div>

      {vm.transcription && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink-700 text-xs uppercase tracking-wider">Transcript</summary>
          <p className="mt-2 text-ink-700 italic whitespace-pre-wrap leading-relaxed">{vm.transcription}</p>
        </details>
      )}

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label text-xs mb-0">AI summary</label>
            {!summary && (
              <button onClick={summarize} disabled={busy !== null} className="btn-ghost !py-1 !px-2 text-[10px]">
                {busy === "summarize" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generate
              </button>
            )}
          </div>
          <div className="text-sm text-ink-700 bg-ink-50 rounded-lg px-3 py-2 min-h-[64px]">
            {summary ?? <span className="text-ink-400 italic">Click &ldquo;Generate&rdquo; for AI summary…</span>}
          </div>
        </div>

        <div>
          <label className="label text-xs">Callback message</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="AI-suggested callback will appear here after summarizing…"
            className="input min-h-[64px] text-sm"
            disabled={sent}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={sendReply} disabled={busy !== null || !reply.trim() || sent} className="btn-primary text-sm">
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {sent ? "Sent" : "Send SMS callback"}
        </button>
        <button onClick={archive} disabled={busy !== null} className="btn-ghost text-sm">
          <Archive className="h-4 w-4" /> Archive
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}
