import { Calendar, MapPin, Wallet } from "lucide-react";
import {
  BUDGET_LABELS,
  TIMELINE_LABELS,
  type MarketplaceLead,
} from "@/lib/marketplace";
import {
  SOURCE_CHANNEL_LABELS,
  type LeadSourceChannel,
} from "@/lib/lead-intake";
import { formatDate } from "@/lib/utils";
import { ClaimButton } from "./ClaimButton";

const SOURCE_TONE: Record<LeadSourceChannel, string> = {
  google_ads:       "bg-blue-100 text-blue-700 ring-blue-200",
  meta_facebook:    "bg-indigo-100 text-indigo-700 ring-indigo-200",
  meta_instagram:   "bg-pink-100 text-pink-700 ring-pink-200",
  website_form:     "bg-emerald-100 text-emerald-700 ring-emerald-200",
  marketplace_form: "bg-amber-100 text-amber-700 ring-amber-200",
  webhook:          "bg-ink-100 text-ink-700 ring-ink-200",
  manual:           "bg-ink-100 text-ink-700 ring-ink-200",
  scraped:          "bg-violet-100 text-violet-700 ring-violet-200",
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function scoreRingColor(score: number) {
  if (score >= 75) return "#10b981"; // emerald
  if (score >= 50) return "#f59e0b"; // amber
  return "#94a3b8"; // ink-400
}

function scoreLabel(score: number) {
  if (score >= 85) return "Hot";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Decent";
  return "Cold";
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = scoreRingColor(score);
  const size = 60;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke="#e2e8f0" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="5" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold tabular-nums">{score}</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-500 font-semibold">
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

export function MarketplaceCard({
  lead,
  balanceCents,
}: {
  lead: MarketplaceLead;
  balanceCents: number;
}) {
  const affordable = balanceCents >= lead.price_cents;
  const source: LeadSourceChannel = (lead.source_channel as LeadSourceChannel | undefined) ?? "marketplace_form";
  const hot = lead.ai_score >= 80;

  return (
    <li className="card card-hover p-5 flex flex-col gap-3 relative overflow-hidden">
      {hot && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight text-lg truncate">{lead.service_type}</h3>
          <div className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3" />
            {[lead.city, lead.zip].filter(Boolean).join(" · ") || "Location not provided"}
          </div>
        </div>
        <ScoreGauge score={lead.ai_score} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`badge ${SOURCE_TONE[source]} text-[10px]`}>
          {SOURCE_CHANNEL_LABELS[source]}
        </span>
        <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">
          <Wallet className="h-2.5 w-2.5 mr-1" /> {BUDGET_LABELS[lead.budget]}
        </span>
        <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">
          <Calendar className="h-2.5 w-2.5 mr-1" /> {TIMELINE_LABELS[lead.timeline]}
        </span>
      </div>

      {lead.ai_summary && (
        <p className="text-sm text-ink-700 italic leading-relaxed line-clamp-3">
          &ldquo;{lead.ai_summary}&rdquo;
        </p>
      )}

      <div className="text-[11px] text-ink-500 mt-auto">
        Posted {formatDate(lead.created_at)}
      </div>

      <div className="flex items-center justify-between border-t border-ink-100 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
            Claim price
          </div>
          <div className="text-2xl font-bold gradient-text tabular-nums leading-none">
            {money(lead.price_cents)}
          </div>
          {!affordable && (
            <div className="text-xs text-rose-600 mt-1">
              Need {money(lead.price_cents - balanceCents)} more
            </div>
          )}
        </div>
        <ClaimButton id={lead.id} disabled={!affordable} />
      </div>
    </li>
  );
}
