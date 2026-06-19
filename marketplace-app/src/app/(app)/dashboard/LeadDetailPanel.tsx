"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Clock, Lock, MapPin, Phone, Shield, SkipForward, Sparkles, Store } from "lucide-react";
import { type MarketplaceLead, BUDGET_LABELS, TIMELINE_LABELS } from "@/lib/marketplace";

interface Props {
  lead: MarketplaceLead | null;
  balanceCents: number;
  /** Optional ISO timestamp at which the current offer expires.
   * Present only when the lead is offered to the current contractor. */
  offerExpiresAt?: string | null;
}

function money(cents: number) { return `$${(cents / 100).toLocaleString()}`; }

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1)    return "Just landed";
  if (min < 60)   return `${min} min old`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h old`;
  const d = Math.floor(h / 24);
  return `${d}d old`;
}

function scoreColor(score: number) {
  if (score >= 85) return "#fb7185";
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#94a3b8";
}

export function LeadDetailPanel({ lead, balanceCents, offerExpiresAt }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const countdown = useCountdown(offerExpiresAt ?? null);

  if (!lead) {
    return (
      <div className="h-full grid place-items-center text-center px-8 py-16 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
        <div>
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-4"
            style={{ background: "linear-gradient(135deg, var(--emerald), var(--emerald-deep))" }}>
            <Store className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Pick a lead on the left.</h3>
          <p className="mt-2 text-sm max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
            Each lead is exclusive — once you claim it, the homeowner&apos;s contact unlocks for you and only you.
          </p>
        </div>
      </div>
    );
  }

  const affordable = balanceCents >= lead.price_cents;
  const hot = lead.ai_score >= 85;
  const ageMin = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 60_000);
  const fresh = ageMin < 60;
  const ring = scoreColor(lead.ai_score);

  const skip = async () => {
    // Skip = decline, which triggers cascade to next contractor immediately.
    startTransition(async () => {
      try {
        await fetch("/api/leads/decline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: lead.id, reason: "skipped" }),
        });
      } catch { /* non-fatal */ }
      const next = new URLSearchParams(params);
      next.delete("lead");
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
      router.refresh();
    });
  };

  const accept = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/leads/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: lead.id }),
        });
        if (res.ok) {
          router.push(`/dashboard/${lead.id}?claimed=1`);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data?.error ?? "This offer is no longer available.");
          router.refresh();
        }
      } catch {
        alert("Network issue — try again.");
      }
    });
  };

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* Top status strip */}
      <div className="px-6 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-wider"
          style={{
            background: hot ? "rgba(251,113,133,0.15)" : "var(--emerald-soft)",
            border: `1px solid ${hot ? "rgba(251,113,133,0.40)" : "color-mix(in srgb, var(--emerald) 40%, transparent)"}`,
            color: hot ? "var(--hot)" : "var(--emerald)",
          }}>
          {hot && (
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "currentColor" }} />
              <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
            </span>
          )}
          {hot ? "HOT" : "OFFERED"} · {timeAgo(lead.created_at).toUpperCase()} · EXCLUSIVE
          {countdown && (
            <span className="inline-flex items-center gap-1 ml-2 pl-2"
              style={{ borderLeft: "1px solid color-mix(in srgb, currentColor 40%, transparent)" }}>
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          )}
        </div>

        <h2 className="mt-4 leading-[1.05]"
          style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: "clamp(28px, 3.4vw, 40px)",
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>
          {lead.name} — <em style={{ fontStyle: "italic", color: "var(--emerald-bright)" }}>{lead.service_type}</em>
        </h2>

        <div className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          <MapPin className="h-3.5 w-3.5" />
          {[lead.city, lead.zip].filter(Boolean).join(", ") || "Location pending"}
        </div>
      </div>

      {/* Stat row */}
      <div className="px-6 mt-5 grid grid-cols-3 gap-3">
        <StatBlock label="AI score" value={`${lead.ai_score}/100`} accent={ring} />
        <StatBlock label="Budget"   value={BUDGET_LABELS[lead.budget]} accent="var(--emerald-bright)" />
        <StatBlock label="Timeline" value={TIMELINE_LABELS[lead.timeline]} accent="var(--emerald-bright)" />
      </div>

      {/* AI summary */}
      {lead.ai_summary && (
        <div className="px-6 mt-5">
          <div className="text-[10px] uppercase tracking-wider font-mono mb-2" style={{ color: "var(--text-faint)" }}>
            Project details
          </div>
          <div className="rounded-2xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {lead.ai_summary}
          </div>
        </div>
      )}

      {/* Trust strip */}
      <div className="px-6 mt-5 space-y-2 text-sm">
        <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Lock className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
          Phone &amp; full address unlock on claim
        </div>
        <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Shield className="h-4 w-4" style={{ color: "var(--emerald)" }} />
          Exclusive — never resold to another contractor
        </div>
        {fresh && (
          <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "var(--emerald-bright)" }} />
            Fresh — landed in the last hour
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Footer CTAs */}
      <div className="px-6 pb-6 pt-5 mt-5 border-t flex items-center gap-3"
        style={{ borderColor: "var(--border)" }}>
        <button onClick={accept} disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--emerald-bright), var(--emerald-deep))",
            color: "#fff",
            boxShadow: "0 10px 24px -10px color-mix(in srgb, var(--emerald) 70%, transparent)",
          }}>
          <CheckCircle2 className="h-4 w-4" />
          {pending ? "Accepting…" : `Accept · ${money(lead.price_cents)}`}
        </button>
        <button onClick={skip} disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}>
          <SkipForward className="h-4 w-4" />
          Decline
        </button>
      </div>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>{label}</div>
      <div className="mt-1.5 text-base font-semibold tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

/** Tiny live countdown ("23:14") for an exclusive-offer window. */
function useCountdown(iso: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const ms = Math.max(0, new Date(iso).getTime() - now);
  if (ms === 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")} left`;
}
