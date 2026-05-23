// Generates per-platform ad strategies (Google + Meta) using Claude, then
// validates + clamps numeric fields so downstream UI can trust them.

import { generateText } from "@/lib/ai";
import type { AdPlatform, AdStrategy, Prospect, ScanResult } from "./types";
import { extractJson } from "./scanner";

export async function generateAdStrategies(
  p: Prospect,
  scan: ScanResult,
): Promise<AdStrategy[]> {
  const [google, meta] = await Promise.all([
    generateOne(p, scan, "google"),
    generateOne(p, scan, "meta"),
  ]);
  return [google, meta];
}

async function generateOne(
  p: Prospect,
  scan: ScanResult,
  platform: AdPlatform,
): Promise<AdStrategy> {
  const system =
    "You are a senior local-PPC strategist. You write tight, conversion-focused " +
    "ad plans grounded in realistic budgets and CPLs for the US local-service market. " +
    "Output VALID JSON only.";

  const platformGuide = platform === "google"
    ? "Google Search + LSA. Optimize for high-intent transactional keywords. Use exact + phrase match. CPLs typically $40-$120 for trades."
    : "Meta Advantage+ campaigns + retargeting. Optimize for lead form fills + Messenger. CPLs typically $15-$60. Detailed targeting by interest + radius.";

  const user = `Build a ${platform.toUpperCase()} ad strategy for this business.

BUSINESS: ${p.business_name}
TRADE: ${p.category ?? "local service"}
CITY: ${p.city ?? "(unknown)"}${p.state ? ", " + p.state : ""}
RATING: ${p.rating ?? "n/a"} (${p.review_count ?? 0} reviews)
SCAN_SUMMARY: ${scan.summary}
WEAKNESSES: ${JSON.stringify(scan.weaknesses)}
OPPORTUNITIES: ${JSON.stringify(scan.opportunities)}
COMPETITORS: ${JSON.stringify(scan.competitors)}

PLATFORM GUIDE: ${platformGuide}

Return ONLY this JSON:
{
  "monthly_budget_low":  number (US dollars, not cents),
  "monthly_budget_high": number (US dollars, not cents),
  "target_audience":     "1-2 sentence target description",
  "keywords":            ["10-15 high-intent ${platform === "google" ? "search keywords" : "interest + intent signals"}"],
  "ad_copy": [
    { "headline": "max 30 chars", "description": "max 90 chars" }
  ],
  "landing_strategy":    "1-2 sentence note on what the landing page should optimize for",
  "expected_cpl_low":    number (US dollars),
  "expected_cpl_high":   number (US dollars),
  "rationale":           "2-3 sentence rationale grounded in the business signal above"
}

ad_copy: provide 4 variants.
All numbers are DOLLARS, not cents. Keep budgets realistic for a small local business.`;

  const raw = await generateText({ system, user, maxTokens: 1500 });
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as Record<string, unknown>;

  return {
    platform,
    monthly_budget_low:  toCents(parsed.monthly_budget_low,  platform === "google" ? 500  : 300),
    monthly_budget_high: toCents(parsed.monthly_budget_high, platform === "google" ? 2000 : 1200),
    target_audience: typeof parsed.target_audience === "string" ? parsed.target_audience : "",
    keywords: arrOfStr(parsed.keywords).slice(0, 20),
    ad_copy: arrOfAdCopy(parsed.ad_copy).slice(0, 6),
    landing_strategy: typeof parsed.landing_strategy === "string" ? parsed.landing_strategy : "",
    expected_cpl_low:  toCents(parsed.expected_cpl_low,  platform === "google" ? 40 : 15),
    expected_cpl_high: toCents(parsed.expected_cpl_high, platform === "google" ? 120 : 60),
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}

function toCents(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  if (!isFinite(n) || n < 0) return fallback * 100;
  // If the model returns cents by mistake (huge number), don't double-multiply.
  return n > 5000 ? Math.round(n) : Math.round(n * 100);
}

function arrOfStr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function arrOfAdCopy(v: unknown): { headline: string; description: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is { headline?: unknown; description?: unknown } => typeof x === "object" && x !== null)
    .map((x) => ({
      headline: typeof x.headline === "string" ? x.headline.slice(0, 30) : "",
      description: typeof x.description === "string" ? x.description.slice(0, 90) : "",
    }))
    .filter((x) => x.headline && x.description);
}
