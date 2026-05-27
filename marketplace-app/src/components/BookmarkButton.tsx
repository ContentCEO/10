"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Props {
  kind: "lead" | "job" | "customer" | "invoice" | "proposal" | "page";
  targetId: string;
  label: string;
  href: string;
}

export function BookmarkButton({ kind, targetId, label, href }: Props) {
  const [pinned, setPinned] = useState<boolean | null>(null);

  // Check initial state.
  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((j: { ok: boolean; bookmarks?: Array<{ kind: string; target_id: string }> }) => {
        if (!j.ok) return;
        const has = (j.bookmarks ?? []).some((b) => b.kind === kind && b.target_id === targetId);
        setPinned(has);
      })
      .catch(() => setPinned(false));
  }, [kind, targetId]);

  async function toggle() {
    const prev = pinned;
    setPinned(!prev);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, target_id: targetId, label, href }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPinned(prev);
        toast({ message: j.error ?? "Couldn't update bookmark", type: "error" });
        return;
      }
      toast({ message: j.bookmarked ? "Pinned" : "Unpinned", type: "success" });
    } catch {
      setPinned(prev);
      toast({ message: "Network error", type: "error" });
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={pinned ? "Unpin" : "Pin"}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition ${
        pinned
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
          : "text-ink-500 hover:text-amber-600 hover:bg-amber-50"
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}
