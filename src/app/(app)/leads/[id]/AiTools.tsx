"use client";

import { useState } from "react";
import { Sparkles, FileText, Copy, Check } from "lucide-react";
import type { Lead } from "@/lib/types";

type Mode = "follow_up" | "proposal";

export function AiTools({ lead }: { lead: Lead }) {
  const [mode, setMode] = useState<Mode>("follow_up");
  const [tone, setTone] = useState("friendly");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setOutput("");
    try {
      const endpoint = mode === "follow_up" ? "/api/ai/follow-up" : "/api/ai/proposal";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate");
      setOutput(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h2 className="font-semibold">AI assistant</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("follow_up")}
          className={mode === "follow_up" ? "btn-primary" : "btn-secondary"}
        >
          <Sparkles className="h-4 w-4" /> Follow-up message
        </button>
        <button
          type="button"
          onClick={() => setMode("proposal")}
          className={mode === "proposal" ? "btn-primary" : "btn-secondary"}
        >
          <FileText className="h-4 w-4" /> Proposal
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Tone</label>
          <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={generate} disabled={loading} className="btn-primary w-full">
            {loading ? "Generating…" : "Generate with AI"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {output && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 relative">
          <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">{output}</pre>
          <button type="button" onClick={copy}
            className="absolute top-2 right-2 btn-secondary !py-1 !px-2 text-xs">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
