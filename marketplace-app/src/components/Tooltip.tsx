"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

/*
 * Plan 1 / F-17 — Inline help tooltips.
 *
 * Lightweight CSS-positioned tooltip. Pure hover/focus, no JS positioning
 * library. For complex floating-UI needs (collisions, autoplacement) we'd
 * upgrade to @floating-ui/react later, but most help text fits in a 240px
 * box without overflowing.
 *
 *   <Tooltip text="Score is 0-100; ContractorFlow uses AI to estimate intent.">
 *     AI score
 *   </Tooltip>
 *
 * Or with an embedded `?` icon (no children):
 *   <Tooltip text="..." />
 */

export function Tooltip({
  text, children, side = "top", className = "",
}: {
  text: string;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "right" | "left";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = children ?? <HelpCircle className="h-3.5 w-3.5 text-ink-400 hover:text-ink-700" />;

  const placement =
    side === "top"    ? "bottom-full mb-1 left-1/2 -translate-x-1/2" :
    side === "bottom" ? "top-full mt-1 left-1/2 -translate-x-1/2" :
    side === "right"  ? "left-full ml-1 top-1/2 -translate-y-1/2" :
                         "right-full mr-1 top-1/2 -translate-y-1/2";

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center cursor-help"
      >
        {trigger}
      </span>
      {open && (
        <span
          role="tooltip"
          className={`absolute ${placement} z-50 w-60 max-w-[60vw] px-2.5 py-1.5 rounded-lg text-xs text-white bg-ink-900 shadow-soft-lg pointer-events-none animate-fade-up`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
