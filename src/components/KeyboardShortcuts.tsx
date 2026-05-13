"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Keyboard, X } from "lucide-react";

/*
 * Plan 1 / Section F / Idea #9 — keyboard shortcuts cheat sheet.
 *
 * Listens globally for `?` (Shift+/) to open the cheat sheet, plus
 * implements a small set of `g X` two-step navigation shortcuts
 * (Gmail-style). Also handles Esc to close.
 *
 * Doesn't fight with input fields — bails if the active element is
 * an <input>, <textarea>, or contenteditable.
 */

interface Shortcut {
  keys: string[];
  label: string;
  href?: string;
  action?: () => void;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gMode, setGMode] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ["?"],          label: "Show this cheat sheet" },
    { keys: ["g", "d"],     label: "Go to Dashboard",       href: "/dashboard" },
    { keys: ["g", "l"],     label: "Go to Leads pipeline",  href: "/leads" },
    { keys: ["g", "j"],     label: "Go to Jobs",            href: "/jobs" },
    { keys: ["g", "c"],     label: "Go to Customers",       href: "/customers" },
    { keys: ["g", "i"],     label: "Go to Inbox",           href: "/inbox" },
    { keys: ["g", "m"],     label: "Go to Marketplace",     href: "/marketplace" },
    { keys: ["g", "p"],     label: "Go to Preferences",     href: "/preferences" },
    { keys: ["n"],          label: "New lead",              href: "/leads/new" },
    { keys: ["Esc"],        label: "Close modal" },
  ];

  useEffect(() => {
    function inTextField(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (inTextField()) return;

      // Esc closes modal
      if (e.key === "Escape") { setOpen(false); setGMode(false); return; }

      // `?` opens cheat sheet (Shift+/)
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); setGMode(false); return; }

      // Two-step "g X" navigation
      if (gMode) {
        const map: Record<string, string> = {
          d: "/dashboard", l: "/leads", j: "/jobs", c: "/customers",
          i: "/inbox", m: "/marketplace", p: "/preferences",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        setGMode(false);
        return;
      }
      if (e.key.toLowerCase() === "g") { setGMode(true); setTimeout(() => setGMode(false), 1200); return; }

      // Single-key shortcuts
      if (e.key.toLowerCase() === "n") { e.preventDefault(); router.push("/leads/new"); return; }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gMode, router]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl ring-1 ring-white/10 shadow-soft-lg overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0c1224 0%, #050816 100%)" }}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
              <Keyboard className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-sm">Keyboard shortcuts</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-white">
              <span className="text-sm text-white/85">{s.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="px-1.5 py-0.5 rounded bg-white/10 ring-1 ring-white/15 text-[11px] font-mono text-white/80"
                  >
                    {k === "Cmd" ? <Command className="h-3 w-3" /> : k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <footer className="px-5 py-3 border-t border-white/10 text-[10px] font-mono uppercase tracking-wider text-white/40">
          Press <kbd className="px-1 py-0.5 rounded bg-white/10 ring-1 ring-white/15">?</kbd> anytime
        </footer>
      </div>
    </div>
  );
}
