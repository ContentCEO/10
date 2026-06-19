// ──────────────────────────────────────────────────────────────────────────
// ContractorFlow Verified Seal — the product's signature credential
// (spec §3.3). Renders as a compact badge in lists OR a large crest on
// profiles. Hover/tap reveals *why* it's earned — transparency IS the trust.
// ──────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { Award, Check, Crown, Shield } from "lucide-react";

export type SealTier = "none" | "verified" | "verified_pro" | "top_pro";

export interface SealEvidence {
  hicNumber?: string | null;          // last 4 of MA HIC reg #
  insuranceOnFile?: boolean;
  verifiedReviewCount?: number;
  avgRating?: number | null;
  medianResponseMins?: number | null;
}

interface Props {
  tier: SealTier;
  size?: "sm" | "md" | "lg";
  evidence?: SealEvidence;
  className?: string;
}

const TIER_LABEL: Record<SealTier, string> = {
  none:         "Unverified",
  verified:     "Verified",
  verified_pro: "Verified Pro",
  top_pro:      "Top Pro",
};

const TIER_ICON: Record<SealTier, typeof Shield> = {
  none:         Shield,
  verified:     Check,
  verified_pro: Award,
  top_pro:      Crown,
};

export function VerifiedSeal({ tier, size = "md", evidence, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  if (tier === "none") return null;

  const Icon = TIER_ICON[tier];

  // Gold accent ring is the only place we use gold at scale — and only
  // for Top Pro. Verified Pro gets the emerald bright; Verified gets emerald base.
  const ring =
    tier === "top_pro"      ? "var(--gold)" :
    tier === "verified_pro" ? "var(--emerald-bright)" :
                              "var(--emerald)";

  const dims =
    size === "lg" ? { box: "h-14 w-14", iconCls: "h-6 w-6", text: "text-sm" } :
    size === "sm" ? { box: "h-6 w-6",   iconCls: "h-3 w-3", text: "text-[10px]" } :
                    { box: "h-9 w-9",   iconCls: "h-4 w-4", text: "text-xs" };

  return (
    <span className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${TIER_LABEL[tier]} seal — tap for details`}
        className={`${dims.box} rounded-full grid place-items-center transition`}
        style={{
          background: `color-mix(in srgb, ${ring} 14%, transparent)`,
          border: `2px solid ${ring}`,
          color: ring,
          boxShadow: tier === "top_pro" ? `0 0 0 3px color-mix(in srgb, ${ring} 25%, transparent)` : "none",
        }}>
        <Icon className={dims.iconCls} strokeWidth={2.5} />
      </button>

      {size !== "sm" && (
        <span className={`${dims.text} font-semibold tracking-tight`} style={{ color: ring }}>
          {TIER_LABEL[tier]}
        </span>
      )}

      {/* Why-earned popover — transparency is the trust anchor. */}
      {open && evidence && (
        <span
          className="absolute z-30 left-0 top-full mt-2 w-64 rounded-xl p-3 text-xs shadow-xl"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}>
          <div className="font-semibold mb-2" style={{ color: "var(--text)" }}>
            Why {TIER_LABEL[tier]}?
          </div>
          <ul className="space-y-1.5">
            {evidence.hicNumber && (
              <li className="flex items-start gap-1.5">
                <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--emerald)" }} />
                MA HIC #****{evidence.hicNumber.slice(-4)} on file
              </li>
            )}
            {evidence.insuranceOnFile && (
              <li className="flex items-start gap-1.5">
                <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--emerald)" }} />
                Liability insurance current
              </li>
            )}
            {typeof evidence.verifiedReviewCount === "number" && evidence.verifiedReviewCount > 0 && (
              <li className="flex items-start gap-1.5">
                <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--emerald)" }} />
                {evidence.verifiedReviewCount} job-verified review{evidence.verifiedReviewCount === 1 ? "" : "s"}
                {evidence.avgRating ? ` @ ${evidence.avgRating.toFixed(1)}★` : ""}
              </li>
            )}
            {typeof evidence.medianResponseMins === "number" && (
              <li className="flex items-start gap-1.5">
                <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--emerald)" }} />
                Responds in ~{formatMins(evidence.medianResponseMins)}
              </li>
            )}
          </ul>
        </span>
      )}
    </span>
  );
}

function formatMins(m: number): string {
  if (m < 60)   return `${m} min`;
  const h = m / 60;
  if (h < 24)   return `${h.toFixed(1)} hr`;
  return `${(h / 24).toFixed(1)} day`;
}
