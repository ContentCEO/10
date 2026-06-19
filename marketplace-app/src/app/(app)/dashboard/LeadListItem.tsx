"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { type MarketplaceLead } from "@/lib/marketplace";

interface Props {
  lead: MarketplaceLead;
  selected: boolean;
}

function money(cents: number) { return `$${(cents / 100).toFixed(0)}`; }

function scoreColor(score: number) {
  if (score >= 85) return "#fb7185"; // hot
  if (score >= 70) return "#10b981"; // strong
  if (score >= 50) return "#f59e0b"; // decent
  return "#94a3b8";
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1)    return "now";
  if (min < 60)   return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)      return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function tradeLabel(s: string | null | undefined): string {
  if (!s) return "—";
  // Heuristic trade abbreviation, since service_type is free text.
  const lower = s.toLowerCase();
  if (/kitchen/.test(lower))  return "KITCH";
  if (/bath/.test(lower))     return "BATH";
  if (/roof/.test(lower))     return "ROOF";
  if (/hvac|heat|cool/.test(lower)) return "HVAC";
  if (/paint/.test(lower))    return "PAINT";
  if (/electric/.test(lower)) return "ELEC";
  if (/plumb/.test(lower))    return "PLUMB";
  if (/sid/.test(lower))      return "SID";
  if (/deck/.test(lower))     return "DECK";
  if (/window/.test(lower))   return "WIN";
  return s.slice(0, 5).toUpperCase();
}

export function LeadListItem({ lead, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params  = useSearchParams();
  const ringColor = scoreColor(lead.ai_score);

  const onClick = () => {
    const next = new URLSearchParams(params);
    next.set("lead", lead.id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
      style={{
        background: selected ? "var(--emerald-soft)" : "transparent",
        border: selected ? "1px solid color-mix(in srgb, var(--emerald) 35%, transparent)" : "1px solid transparent",
      }}>
      {/* Score chip */}
      <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0 text-sm font-bold tabular-nums"
        style={{
          background: `${ringColor}1f`,
          border: `1px solid ${ringColor}55`,
          color: ringColor,
        }}>
        {lead.ai_score}
      </div>

      {/* Main label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {lead.name}
          </span>
          <span className="text-[10px] font-mono tracking-wider shrink-0"
            style={{ color: "var(--text-faint)" }}>
            {tradeLabel(lead.service_type)}
          </span>
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
          {[lead.city, lead.zip].filter(Boolean).join(" ") || "—"}
          {lead.ai_summary ? ` · ${lead.ai_summary.split(/[.!?]/)[0].slice(0, 60)}` : ""}
        </div>
      </div>

      {/* Right meta */}
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums" style={{ color: ringColor }}>
          {money(lead.price_cents)}
        </div>
        <div className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
          {timeAgo(lead.created_at)}
        </div>
      </div>
    </button>
  );
}
