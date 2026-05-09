"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

function getVisitorToken(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "aistaffer.visitor";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v =
      (crypto?.randomUUID?.() as string) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function ChatInterface({
  slug,
  greeting,
  employeeName,
  color = "#0070c4",
  apiBase = "",
  compact = false,
}: {
  slug: string;
  greeting?: string | null;
  employeeName?: string;
  color?: string;
  apiBase?: string;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(() =>
    greeting ? [{ role: "assistant", content: greeting }] : [],
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setPending(true);

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          visitorToken: getVisitorToken(),
          message: text,
          sourceUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Chat failed");
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`flex h-full flex-col overflow-hidden bg-white ${compact ? "" : "rounded-xl border border-slate-200 shadow-sm"}`}
    >
      <header
        className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 text-white"
        style={{ background: color }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          {employeeName?.[0] ?? "AI"}
        </div>
        <div>
          <p className="text-sm font-semibold">{employeeName ?? "Assistant"}</p>
          <p className="text-[11px] opacity-80">Typically replies instantly</p>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl px-3 py-2 text-sm text-white"
                  : "max-w-[80%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900"
              }
              style={m.role === "user" ? { background: color } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
              <span className="inline-flex gap-1">
                <Dot /> <Dot delay={120} /> <Dot delay={240} />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t border-slate-200 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Type your message…"
          className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: color }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
