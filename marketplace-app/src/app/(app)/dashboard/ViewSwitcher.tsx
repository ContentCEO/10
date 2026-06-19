"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, Map, Rows3, SplitSquareHorizontal } from "lucide-react";

export type ViewMode = "split" | "grid" | "table" | "map";

const OPTIONS: { id: ViewMode; label: string; icon: typeof LayoutGrid; disabled?: boolean }[] = [
  { id: "split", label: "Split",  icon: SplitSquareHorizontal },
  { id: "grid",  label: "Grid",   icon: LayoutGrid },
  { id: "table", label: "Table",  icon: Rows3 },
  { id: "map",   label: "Map",    icon: Map, disabled: true }, // Phase 2 — needs Mapbox
];

export function ViewSwitcher({ active }: { active: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setView = (v: ViewMode) => {
    const next = new URLSearchParams(params);
    if (v === "split") next.delete("view"); else next.set("view", v);
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  };

  return (
    <div className="inline-flex rounded-xl p-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const on = active === opt.id;
        return (
          <button key={opt.id} onClick={() => !opt.disabled && setView(opt.id)} disabled={opt.disabled}
            title={opt.disabled ? "Coming soon" : opt.label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40"
            style={{
              background: on ? "var(--emerald-soft)" : "transparent",
              color: on ? "var(--emerald)" : "var(--text-muted)",
              border: on ? "1px solid color-mix(in srgb, var(--emerald) 35%, transparent)" : "1px solid transparent",
            }}>
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
