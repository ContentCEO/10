"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "@/components/Toaster";

/*
 * Plan 1 / Section A / Idea #13 — Quick reply buttons in inbox.
 *
 * Canned 1-tap replies + free-text. Sends via POST /api/sms/send.
 * Optimistic toast; locks input during send.
 */

const CANNED = [
  "Thanks — got it.",
  "On my way — be there shortly.",
  "Will call you in 10 min.",
  "Can we do tomorrow morning?",
  "Sending you a quote now.",
  "What time works best for you?",
];

export function ThreadReply({ to }: { to: string }) {
  const [custom, setCustom] = useState("");
  const [sentToken, setSentToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(text: string) {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setSentToken(trimmed);
    startTransition(async () => {
      try {
        const res = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, body: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ message: data?.error ?? `Send failed (${res.status})`, type: "error" });
          setSentToken(null);
          return;
        }
        if (data.skipped) {
          toast({ message: "Twilio not configured — message not sent.", type: "warning" });
        } else {
          toast({ message: `Sent to ${to}`, type: "success" });
        }
        setCustom("");
      } catch (e) {
        toast({ message: e instanceof Error ? e.message : "Send failed", type: "error" });
        setSentToken(null);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CANNED.map((line) => (
          <button
            key={line}
            onClick={() => send(line)}
            disabled={pending}
            className={
              sentToken === line
                ? "text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                : "text-xs px-2.5 py-1 rounded-full bg-white ring-1 ring-ink-200 hover:bg-ink-50 disabled:opacity-50"
            }
          >
            {pending && sentToken === line ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}
            {line}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(custom); }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Type a custom reply..."
          maxLength={1500}
          className="flex-1 rounded-full ring-1 ring-ink-200 bg-white px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          disabled={pending}
        />
        <button type="submit" disabled={pending || !custom.trim()} className="btn-primary text-xs px-3 py-1.5">
          {pending && sentToken === custom.trim()
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Send className="h-3.5 w-3.5" />}
          Send
        </button>
      </form>
    </div>
  );
}
