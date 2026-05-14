"use client";

import { useState, useTransition } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "@/components/Toaster";

type Audience = "all" | "recurring" | "recent";

const AUDIENCES: { v: Audience; label: string; hint: string }[] = [
  { v: "all",       label: "All customers",     hint: "Everyone in your book" },
  { v: "recurring", label: "Recurring only",    hint: "Customers with active recurring schedule" },
  { v: "recent",    label: "Active last 12 mo", hint: "Customers with a job in the last year" },
];

export function BroadcastForm() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; capped: boolean } | null>(null);

  function send() {
    if (!message.trim()) {
      toast({ message: "Write a message first", type: "error" });
      return;
    }
    if (message.length > 320) {
      toast({ message: "Message exceeds 320 chars", type: "error" });
      return;
    }
    if (!confirm(`Send this SMS to your "${AUDIENCES.find((a) => a.v === audience)?.label}" audience?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/sms/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim(), audience }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast({ message: json.error ?? "Broadcast failed", type: "error" });
          return;
        }
        setResult(json);
        toast({ message: `Sent to ${json.sent} of ${json.total}`, type: "success" });
        setMessage("");
      } catch {
        toast({ message: "Network error", type: "error" });
      }
    });
  }

  const charCount = message.length;
  const tooLong = charCount > 320;

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
                <input
                  type="radio"
                  name="audience"
                  value={a.v}
                  checked={audience === a.v}
                  onChange={() => setAudience(a.v)}
                  className="sr-only"
                />
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="text-xs text-ink-500">{a.hint}</div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="msg">Message</label>
          <textarea
            id="msg"
            className="input min-h-[120px] font-mono text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey {{first_name}}, quick heads-up — closed Mon for the holiday. Back Tues at 8 AM. Thanks!"
            maxLength={400}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
            <span>
              Use <code className="bg-ink-100 px-1 rounded">{"{{first_name}}"}</code> to personalize.
            </span>
            <span className={`tabular-nums font-mono ${tooLong ? "text-rose-600 font-semibold" : ""}`}>
              {charCount} / 320
            </span>
          </div>
        </div>

        <button onClick={send} disabled={pending || !message.trim() || tooLong} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Send broadcast
        </button>
      </section>

      {result && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="text-sm">
            Delivered to <strong className="font-mono tabular-nums">{result.sent}</strong> of{" "}
            <strong className="font-mono tabular-nums">{result.total}</strong> recipients.
            {result.failed > 0 && (
              <span className="text-rose-600"> {result.failed} failed.</span>
            )}
            {result.capped && (
              <div className="mt-1 text-xs text-amber-700">
                Hit the 250-recipient cap. Run again to send to the next batch.
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
