"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin, Sparkles, Wallet } from "lucide-react";
import { type MarketplaceLead, BUDGET_LABELS, TIMELINE_LABELS } from "@/lib/marketplace";
import { SOURCE_CHANNEL_LABELS, type LeadSourceChannel } from "@/lib/lead-intake";

const SOURCE_TONE: Record<LeadSourceChannel, string> = {
  google_ads:       "text-sky-300       bg-sky-500/12       ring-sky-400/25",
  meta_facebook:    "text-blue-300      bg-blue-500/12      ring-blue-400/25",
  meta_instagram:   "text-pink-300      bg-pink-500/12      ring-pink-400/25",
  website_form:     "text-emerald-300   bg-emerald-500/12   ring-emerald-400/25",
  marketplace_form: "text-amber-300     bg-amber-500/12     ring-amber-400/25",
  webhook:          "text-white/70      bg-white/[0.06]     ring-white/10",
  manual:           "text-white/70      bg-white/[0.06]     ring-white/10",
  scraped:          "text-violet-300    bg-violet-500/12    ring-violet-400/25",
};

function money(cents: number) { return `$${(cents / 100).toFixed(0)}`; }

function scoreColor(score: number) {
  if (score >= 85) return "#fb7185";
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#94a3b8";
}

function scoreLabel(score: number) {
  if (score >= 85) return "Hot";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Decent";
  return "Cold";
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1)    return "Just landed";
  if (min < 60)   return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)      return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ScoreRing({ score }: { score: number }) {
  const radius = 24, size = 64;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}77)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-bold tabular-nums text-white">{score}</span>
        <span className="text-[8px] uppercase tracking-wider font-semibold mt-0.5" style={{ color }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

export function MarketplaceCard({ lead }: { lead: MarketplaceLead }) {
  const source: LeadSourceChannel = (lead.source_channel as LeadSourceChannel | undefined) ?? "marketplace_form";
  const hot = lead.ai_score >= 85;
  const fresh = (Date.now() - new Date(lead.created_at).getTime()) < 60 * 60 * 1000;

  return (
    <Link href={`/dashboard/${lead.id}`}
      className="group relative overflow-hidden rounded-2xl flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        background: hot
          ? "linear-gradient(135deg, rgba(251,113,133,0.06), rgba(255,255,255,0.02))"
          : "rgba(255,255,255,0.03)",
        border: hot
          ? "1px solid rgba(251,113,133,0.35)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hot
          ? "0 12px 30px -14px rgba(251,113,133,0.55)"
          : "0 8px 22px -14px rgba(0,0,0,0.5)",
      }}>

      {hot && (
        <div className="absolute -top-px left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #fbbf24, #fb7185, #ec4899)" }} />
      )}

      {hot && (
        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold text-rose-100"
          style={{ background: "rgba(251,113,133,0.20)", border: "1px solid rgba(251,113,133,0.45)" }}>
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-rose-400" />
          </span>
          Hot now
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold tracking-tight text-base truncate text-white">{lead.service_type}</h3>
          <div className="text-xs text-white/55 flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {[lead.city, lead.zip].filter(Boolean).join(" · ") || "Location pending"}
          </div>
        </div>
        <ScoreRing score={lead.ai_score} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center rounded-full ring-1 ring-inset px-2 py-0.5 text-[10px] font-medium ${SOURCE_TONE[source]}`}>
          {SOURCE_CHANNEL_LABELS[source]}
        </span>
        <span className="inline-flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 text-white/70 px-2 py-0.5 text-[10px] font-medium">
          <Wallet className="h-2.5 w-2.5 mr-1" /> {BUDGET_LABELS[lead.budget]}
        </span>
        <span className="inline-flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 text-white/70 px-2 py-0.5 text-[10px] font-medium">
          <Calendar className="h-2.5 w-2.5 mr-1" /> {TIMELINE_LABELS[lead.timeline]}
        </span>
        {fresh && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/12 ring-1 ring-emerald-400/30 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> Fresh
          </span>
        )}
      </div>

      {lead.ai_summary && (
        <p className="text-sm text-white/75 italic leading-relaxed line-clamp-3">
          &ldquo;{lead.ai_summary}&rdquo;
        </p>
      )}

      <div className="text-[11px] text-white/40 inline-flex items-center gap-1 mt-auto">
        <Clock className="h-3 w-3" /> {timeAgo(lead.created_at)}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3 -mx-1 px-1">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold font-mono">
            Claim price
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none mt-1"
            style={{
              backgroundImage: hot
                ? "linear-gradient(135deg, #fbbf24, #fb7185)"
                : "linear-gradient(135deg, #34d399, #10b981)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
            {money(lead.price_cents)}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 group-hover:text-emerald-200 transition">
          View + claim →
        </div>
      </div>
    </Link>
  );
}
