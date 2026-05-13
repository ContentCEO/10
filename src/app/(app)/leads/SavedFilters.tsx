"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bookmark, BookmarkPlus, Flame, Plus, Sparkles, X } from "lucide-react";
import { toast } from "@/components/Toaster";

/*
 * Plan 1 / Section A / Idea #3 — Saved filters on leads.
 *
 * Combines preset "starter" filter chips with user-saved combinations stored
 * in localStorage. Click a chip → URL navigates. "Save current view" stores
 * whatever query params are active right now under a user-chosen name.
 */

interface SavedFilter {
  id: string;
  name: string;
  query: string;       // e.g. "sort=score&status=open"
  created_at: number;
}

const STORAGE_KEY = "cf:saved-filters:leads";

const PRESETS: { name: string; query: string; icon?: typeof Bookmark }[] = [
  { name: "All",            query: "" },
  { name: "Open only",      query: "status=open" },
  { name: "Hot AI score",   query: "sort=score", icon: Flame },
  { name: "Newest",         query: "" },
  { name: "Stale (7+ days)",query: "stale=7" },
  { name: "Won",            query: "status=won" },
];

function readStore(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFilter[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeStore(items: SavedFilter[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20))); } catch { /* */ }
}

export function SavedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentQuery = params.toString();

  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [savingName, setSavingName] = useState<string | null>(null);

  useEffect(() => { setSaved(readStore()); }, []);

  function applyChip(query: string) {
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url);
  }

  function startSave() {
    setSavingName("");
  }

  function commitSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (savingName === null) return;
    const name = savingName.trim();
    if (!name) { setSavingName(null); return; }
    const next: SavedFilter[] = [
      { id: `f-${Date.now()}`, name, query: currentQuery, created_at: Date.now() },
      ...saved.filter((s) => s.name !== name),
    ];
    writeStore(next);
    setSaved(next);
    setSavingName(null);
    toast({ message: `Saved "${name}" filter.`, type: "success" });
  }

  function remove(id: string) {
    const next = saved.filter((s) => s.id !== id);
    writeStore(next);
    setSaved(next);
  }

  const currentIsPreset = PRESETS.some((p) => p.query === currentQuery);
  const currentIsSaved  = saved.some((s) => s.query === currentQuery);

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      {PRESETS.map((p) => {
        const active = p.query === currentQuery;
        return (
          <button
            key={p.name}
            onClick={() => applyChip(p.query)}
            className={
              active
                ? "inline-flex items-center gap-1 rounded-full bg-brand-gradient text-white px-3 py-1 font-medium shadow-glow"
                : "inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-ink-200 px-3 py-1 hover:bg-ink-50"
            }
          >
            {p.icon && <p.icon className="h-3 w-3" />}
            {p.name}
          </button>
        );
      })}

      {saved.length > 0 && <span className="mx-1 text-ink-300">·</span>}

      {saved.map((s) => {
        const active = s.query === currentQuery;
        return (
          <span
            key={s.id}
            className={
              active
                ? "group inline-flex items-center gap-1 rounded-full bg-brand-500 text-white px-3 py-1 font-medium"
                : "group inline-flex items-center gap-1 rounded-full bg-amber-50 ring-1 ring-amber-200 px-3 py-1 text-amber-800"
            }
          >
            <button onClick={() => applyChip(s.query)} className="inline-flex items-center gap-1">
              <Bookmark className="h-3 w-3" /> {s.name}
            </button>
            <button onClick={() => remove(s.id)} aria-label="Delete" className="opacity-0 group-hover:opacity-100 transition">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {savingName === null ? (
        !currentIsPreset && !currentIsSaved && currentQuery && (
          <button
            onClick={startSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 px-3 py-1 hover:bg-emerald-100"
          >
            <BookmarkPlus className="h-3 w-3" /> Save this view
          </button>
        )
      ) : (
        <form onSubmit={commitSave} className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            onBlur={commitSave}
            onKeyDown={(e) => { if (e.key === "Escape") setSavingName(null); }}
            placeholder="Filter name..."
            className="rounded-full ring-1 ring-brand-300 px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
      )}
    </div>
  );
}
