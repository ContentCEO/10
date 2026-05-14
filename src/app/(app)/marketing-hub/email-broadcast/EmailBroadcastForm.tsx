"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "@/components/Toaster";

type Audience = "all" | "recurring" | "recent";

const AUDIENCES: { v: Audience; label: string; hint: string }[] = [
  { v: "all",       label: "All customers",     hint: "Everyone with an email" },
  { v: "recurring", label: "Recurring only",    hint: "Active recurring schedule" },
  { v: "recent",    label: "Active last 12 mo", hint: "Recent job history" },
];

export function EmailBroadcastForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; capped: boolean } | null>(null);

  function send() {
    if (!subject.trim() || !body.trim()) {
      toast({ message: "Subject and body required", type: "error" });
      return;
    }
    if (!confirm(`Email your "${AUDIENCES.find((a) => a.v === audience)?.label}" audience?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/email/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject.trim(), body: body.trim(), audience }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast({ message: json.error ?? "Broadcast failed", type: "error" });
          return;
        }
        setResult(json);
        toast({ message: `Sent to ${json.sent} of ${json.total}`, type: "success" });
        setSubject(""); setBody("");
      } catch {
        toast({ message: "Network error", type: "error" });
      }
    });
  }

  return (
    <>
      <section className="card p-5 space-y-4">
        <div>
          <label className="label">Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {AUDIENCES.map((a) => (
              <label key={a.v}
                className={`cursor-pointer rounded-xl p-3 ring-1 transition ${
                  audience === a.v
                    ? "bg-brand-50 ring-brand-300 ring-2"
                    : "bg-white ring-ink-200 hover:bg-ink-50"
                }`}>
                <input type="radio" name="audience" value={a.v}
                  checked={audience === a.v}
                  onChange={() => setAudience(a.v)}
                  className="sr-only" />
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="text-xs text-ink-500">{a.hint}</div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="subj">Subject</label>
          <input id="subj" className="input" value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A quick update from {{first_name}}'s contractor"
            maxLength={200} />
          <div className="mt-1 text-xs text-ink-500 tabular-nums font-mono">{subject.length} / 200</div>
        </div>

        <div>
          <label className="label" htmlFor="body">Body</label>
          <textarea id="body" className="input min-h-[200px] text-sm"
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Hey {{first_name}},&#10;&#10;Just a quick note..."
            maxLength={5000} />
          <div className="mt-1 text-xs text-ink-500 tabular-nums font-mono">{body.length} / 5000</div>
        </div>

        <button onClick={send} disabled={pending || !subject.trim() || !body.trim()} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send broadcast
        </button>
      </section>

      {result && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="text-sm">
            Delivered to <strong className="font-mono tabular-nums">{result.sent}</strong> of{" "}
            <strong className="font-mono tabular-nums">{result.total}</strong> recipients.
            {result.failed > 0 && <span className="text-rose-600"> {result.failed} failed.</span>}
            {result.capped && (
              <div className="mt-1 text-xs text-amber-700">
                Hit the 200-recipient cap. Run again for the next batch.
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
