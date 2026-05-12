"use client";

import { useState } from "react";
import { Calendar, Check, MapPin, Wallet, X } from "lucide-react";
import {
  BUDGET_LABELS,
  TIMELINE_LABELS,
  type BudgetTier,
  type TimelineTier,
  type MarketplaceLead,
} from "@/lib/marketplace";
import { computeLeadPrice, formatSuggested } from "@/lib/lead-pricing";
import { formatDate } from "@/lib/utils";

interface Lead extends MarketplaceLead {
  source_channel?: string;
  raw_payload?: Record<string, unknown> | null;
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-ink-400";
}

function priceDollars(cents: number) { return `$${(cents / 100).toFixed(0)}`; }

export function CurationRow({ lead, sourceLabel }: { lead: Lead; sourceLabel?: string }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [hidden, setHidden] = useState(false);
  const [price, setPrice] = useState(lead.price_cents);
  const [score, setScore] = useState(lead.ai_score);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject", reason?: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/curation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          action,
          price_cents: action === "approve" ? price : undefined,
          ai_score: action === "approve" ? score : undefined,
          reason,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setHidden(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (hidden) return null;

  return (
    <li className="card p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold tracking-tight">{lead.service_type}</h3>
                {sourceLabel && (
                  <span className="badge bg-violet-100 text-violet-700 ring-violet-200 text-[10px]">
                    {sourceLabel}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3" />
                {[lead.city, lead.zip].filter(Boolean).join(" · ") || "Unknown location"}
                <span className="text-ink-300 mx-1">·</span>
                Posted {formatDate(lead.created_at)}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full text-white font-bold tabular-nums ${scoreTone(lead.ai_score)}`}>
                {lead.ai_score}
              </div>
              <div className="text-[10px] text-ink-500 mt-1">AI score</div>
            </div>
          </div>

          {lead.ai_summary && (
            <p className="mt-3 text-sm text-ink-700 italic line-clamp-2">&ldquo;{lead.ai_summary}&rdquo;</p>
          )}

          {lead.notes && (
            <details className="mt-3 text-xs text-ink-600">
              <summary className="cursor-pointer font-medium text-ink-700">Full details</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-snug bg-ink-50 p-3 rounded-lg max-h-48 overflow-y-auto">{lead.notes}</pre>
            </details>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">
              <Wallet className="h-2.5 w-2.5 mr-1" /> {BUDGET_LABELS[lead.budget as BudgetTier] ?? lead.budget}
            </span>
            <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">
              <Calendar className="h-2.5 w-2.5 mr-1" /> {TIMELINE_LABELS[lead.timeline as TimelineTier] ?? lead.timeline}
            </span>
          </div>
        </div>

        <div className="lg:w-64 shrink-0 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-ink-100 lg:pl-5 pt-3 lg:pt-0">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label text-xs mb-0">Marketplace price</label>
              {(() => {
                const suggested = computeLeadPrice({
                  ai_score: score,
                  budget: lead.budget,
                  external_id: lead.external_id ?? null,
                });
                if (suggested !== price) {
                  return (
                    <button
                      type="button"
                      onClick={() => setPrice(suggested)}
                      className="text-[10px] text-brand-600 font-medium hover:underline"
                    >
                      Suggest: {formatSuggested(suggested)}
                    </button>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-ink-500 text-sm">$</span>
              <input
                type="number"
                value={(price / 100).toFixed(0)}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value) * 100))}
                className="input !py-1.5 text-sm tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">AI score override</label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="input !py-1.5 text-sm tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <button
              onClick={() => run("approve")}
              disabled={busy !== null}
              className="btn-primary !py-2 text-sm"
            >
              <Check className="h-4 w-4" /> {busy === "approve" ? "…" : `Approve · ${priceDollars(price)}`}
            </button>
            <button
              onClick={() => run("reject")}
              disabled={busy !== null}
              className="btn-secondary !py-2 text-sm"
            >
              <X className="h-4 w-4" /> {busy === "reject" ? "…" : "Reject"}
            </button>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    </li>
  );
}
