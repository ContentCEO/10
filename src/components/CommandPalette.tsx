"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, FileText, Hammer, Receipt, Search, Users, X } from "lucide-react";

interface Hit {
  kind: "lead" | "job" | "customer" | "invoice" | "proposal";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  meta: string | null;
}

const ICONS = {
  lead:     Briefcase,
  job:      Hammer,
  customer: Users,
  invoice:  Receipt,
  proposal: FileText,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input when opening.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open || q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.ok) setHits(json.results ?? []);
      } catch { /* silent */ }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-ink-900/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="card w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-200/70">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, jobs, customers, invoices…"
            className="flex-1 outline-none text-sm placeholder:text-ink-400 bg-transparent"
          />
          <kbd className="text-[10px] text-ink-400 font-mono">esc</kbd>
          <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400 italic">
              Type at least 2 characters to search
            </div>
          ) : loading ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400 italic">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400 italic">
              No matches for &ldquo;{q}&rdquo;
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {hits.map((h) => {
                const Icon = ICONS[h.kind];
                return (
                  <li key={`${h.kind}-${h.id}`}>
                    <Link href={h.href} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/40">
                      <Icon className="h-4 w-4 text-ink-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{h.title}</div>
                        {h.subtitle && (
                          <div className="text-xs text-ink-500 truncate">{h.subtitle}</div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-ink-500 shrink-0">{h.kind}</span>
                      {h.meta && (
                        <span className="text-[10px] text-ink-500 font-mono tabular-nums shrink-0">{h.meta}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-ink-200/70 text-[10px] text-ink-400 flex items-center justify-between">
          <span>↑ ↓ to navigate · ↵ to open</span>
          <span><kbd className="font-mono">⌘K</kbd> opens this</span>
        </div>
      </div>
    </div>
  );
}
