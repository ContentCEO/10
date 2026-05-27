"use client";

import { useState } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";

/*
 * Floating "Help me" assistant button.
 *
 * Today: stub UI with a message input. Submissions go to /api/ai/help-chat
 * which is intentionally not wired yet — clicking Send shows a polite
 * "coming soon" message in the chat thread instead of sending.
 *
 * Wire-up plan: POST to /api/ai/help-chat with the message + user context;
 * server-side uses Claude with function-calling tools for: lookup_lead,
 * draft_followup, book_appointment, etc.
 */

export function FloatingHelp() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hey — I'm your AI assistant. Once I'm wired up I can look up leads, draft messages, schedule, and answer questions about your business. For now I'm in preview." },
  ]);

  function send() {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: text.trim() },
      { role: "assistant", content: "Got it. AI tool calls aren't wired up yet — coming in the next batch. I can already see your message lands here cleanly though." },
    ]);
    setText("");
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-brand-gradient text-white shadow-glow hover:scale-105 transition flex items-center justify-center"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-2xl ring-1 ring-white/10 shadow-soft-lg overflow-hidden flex flex-col" style={{
          background: "linear-gradient(180deg, #0c1224 0%, #050816 100%)",
          maxHeight: "70vh",
        }}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <span className="font-semibold text-sm">AI Assistant</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">preview</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                <div className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl px-3 py-2 bg-brand-gradient text-white text-sm"
                    : "max-w-[85%] rounded-2xl px-3 py-2 bg-white/5 ring-1 ring-white/10 text-white/85 text-sm"
                }>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 p-2">
            <div className="flex items-center gap-2 bg-white/5 ring-1 ring-white/10 rounded-xl px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 text-white/40" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Ask anything — book an appointment, draft a message…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
              <button onClick={send} className="text-brand-300 hover:text-white">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
