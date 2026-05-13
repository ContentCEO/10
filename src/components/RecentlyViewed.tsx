"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, X } from "lucide-react";

/*
 * Plan 1 / Section A / Idea #9 — Recently viewed strip.
 *
 * Tracks the last 8 lead/job/customer pages the user opened, localStorage
 * only (no server roundtrip). Shows them as quick-jump chips. Mount once
 * in the (app) layout — renders only when there's data + we're on a
 * page where it's useful.
 */

interface ViewedItem {
  href: string;
  label: string;
  kind: "lead" | "job" | "customer" | "page";
  at: number;
}

const STORAGE_KEY = "cf:recently-viewed";
const MAX_ITEMS = 8;

function readStore(): ViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewedItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch { return []; }
}

function writeStore(items: ViewedItem[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); } catch { /* */ }
}

function deriveLabel(path: string, title?: string): { label: string; kind: ViewedItem["kind"] } | null {
  if (!title) {
    // Pull the last path segment if we can't read a page title.
    const seg = path.split("/").filter(Boolean).pop();
    if (!seg) return null;
    if (/^[0-9a-f-]{8,}$/.test(seg)) return null; // raw UUID, no label
    return { label: seg.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()), kind: "page" };
  }
  const cleaned = title.replace(/· ContractorFlow$/i, "").trim();
  if (path.startsWith("/leads/")) return { label: cleaned, kind: "lead" };
  if (path.startsWith("/jobs/"))  return { label: cleaned, kind: "job" };
  if (path.startsWith("/customers/")) return { label: cleaned, kind: "customer" };
  return { label: cleaned, kind: "page" };
}

export function RecentlyViewed() {
  const pathname = usePathname();
  const [items, setItems] = useState<ViewedItem[]>([]);

  // Track current page on mount + path change.
  useEffect(() => {
    if (!pathname) return;
    // Only track detail-y pages, not list/index pages.
    const trackable =
      /^\/leads\/[^/]+$/.test(pathname) ||
      /^\/jobs\/[^/]+$/.test(pathname) ||
      /^\/customers\/[^/]+$/.test(pathname);
    if (!trackable) return;

    const derived = deriveLabel(pathname, document.title);
    if (!derived) return;

    const existing = readStore().filter((x) => x.href !== pathname);
    const next: ViewedItem[] = [{ href: pathname, label: derived.label, kind: derived.kind, at: Date.now() }, ...existing];
    writeStore(next);
    setItems(next);
  }, [pathname]);

  // Hydrate on mount.
  useEffect(() => { setItems(readStore()); }, []);

  function remove(href: string) {
    const next = items.filter((i) => i.href !== href);
    writeStore(next);
    setItems(next);
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-2">
      <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold flex items-center gap-1 shrink-0 pr-1">
        <Clock className="h-3 w-3" /> Recent
      </span>
      {items.map((it) => (
        <span key={it.href} className="group inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-ink-200/70 px-2.5 py-1 text-xs whitespace-nowrap shrink-0 hover:bg-ink-50 transition">
          <Link href={it.href} className="text-ink-700 hover:text-ink-900 font-medium">{it.label}</Link>
          <button onClick={() => remove(it.href)} aria-label="Remove" className="text-ink-300 hover:text-ink-600 opacity-0 group-hover:opacity-100 transition">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
