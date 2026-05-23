// Scans a prospect's existing presence: website HTML, social URLs, GBP
// signal (rating/reviews from the discovery row), competitor benchmark.
// Output feeds the AI site/ad generator and gives reps real talking points.

import { generateText } from "@/lib/ai";
import { discoverFromPlaces } from "./places";
import type { CompetitorBenchmark, Prospect, ScanResult } from "./types";

const UA = "Mozilla/5.0 (compatible; ContractorFlow-Outreach/1.0; +https://contractorflow.com/bot)";
const FETCH_TIMEOUT_MS = 8000;

export async function scanProspect(prospect: Prospect): Promise<ScanResult> {
  const [siteData, competitors] = await Promise.all([
    prospect.website_url ? fetchWebsite(prospect.website_url) : Promise.resolve(null),
    findCompetitors(prospect),
  ]);

  const detected = siteData ? extractFromHtml(siteData.html) : null;
  const scores = scoreSite(siteData, prospect);

  const narrative = await generateScanNarrative({
    business_name: prospect.business_name,
    category: prospect.category,
    city: prospect.city,
    has_website: Boolean(prospect.website_url),
    website_title: detected?.title ?? null,
    website_meta: detected?.metaDesc ?? null,
    detected_services: detected?.services ?? [],
    rating: prospect.rating,
    review_count: prospect.review_count,
    scores,
    competitors,
  });

  return {
    prospect_id: prospect.id,
    website_html_size: siteData?.html.length ?? null,
    website_title: detected?.title ?? null,
    website_meta_desc: detected?.metaDesc ?? null,
    detected_services: detected?.services ?? [],
    detected_colors: detected?.colors ?? [],
    detected_logos: detected?.logos ?? [],
    score_speed: scores.speed,
    score_design: scores.design,
    score_seo: scores.seo,
    score_conversion: scores.conversion,
    score_overall: scores.overall,
    summary: narrative.summary,
    weaknesses: narrative.weaknesses,
    opportunities: narrative.opportunities,
    competitors,
  };
}

// ---------- HTML fetch + parse ----------

interface SiteData {
  html: string;
  status: number;
  loadMs: number;
}

async function fetchWebsite(url: string): Promise<SiteData | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 250_000); // cap
    return { html, status: res.status, loadMs: Date.now() - start };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

interface Parsed {
  title: string | null;
  metaDesc: string | null;
  services: string[];
  colors: string[];
  logos: string[];
}

function extractFromHtml(html: string): Parsed {
  const title = match(html, /<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc = match(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  // Pull H2/H3 text as "services" candidates — crude but useful as a signal.
  const headings = Array.from(html.matchAll(/<h[23][^>]*>([^<]{3,80})<\/h[23]>/gi))
    .map((m) => stripTags(m[1]))
    .filter(Boolean)
    .slice(0, 10);

  // Logo candidates: <img> whose src/alt contains "logo".
  const logos = Array.from(
    html.matchAll(/<img[^>]*(?:src|alt)=["']([^"']*logo[^"']*)["'][^>]*>/gi),
  )
    .map((m) => m[1])
    .slice(0, 3);

  // Hex colors mentioned inline (rough brand-color signal).
  const colors = uniq(
    Array.from(html.matchAll(/#([0-9a-f]{6})\b/gi)).map((m) => `#${m[1].toLowerCase()}`),
  ).slice(0, 6);

  return {
    title: title ?? null,
    metaDesc: metaDesc ?? null,
    services: dedupe(headings).slice(0, 6),
    colors,
    logos,
  };
}

function match(s: string, re: RegExp): string | null {
  const m = re.exec(s);
  return m?.[1]?.trim() ?? null;
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function uniq<T>(a: T[]): T[] { return Array.from(new Set(a)); }
function dedupe(a: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of a) {
    const k = v.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(v); }
  }
  return out;
}

// ---------- Heuristic scoring (0-100) ----------

interface Scores { speed: number; design: number; seo: number; conversion: number; overall: number }

function scoreSite(site: SiteData | null, p: Prospect): Scores {
  if (!site) {
    // No website at all — every score is rock-bottom = huge opportunity.
    return { speed: 10, design: 5, seo: 5, conversion: 5, overall: 6 };
  }
  const speed = clamp(100 - Math.floor(site.loadMs / 30));            // 1s ≈ 67
  const sizeKb = Math.round(site.html.length / 1024);
  const seoBase = /<title>/i.test(site.html) ? 50 : 20;
  const seoMeta = /name=["']description["']/i.test(site.html) ? 20 : 0;
  const seoOg   = /property=["']og:/i.test(site.html) ? 10 : 0;
  const seoH1   = /<h1\b/i.test(site.html) ? 10 : 0;
  const seo = clamp(seoBase + seoMeta + seoOg + seoH1);

  const designSignals =
    (/tailwind|bootstrap|wp-content\/themes/i.test(site.html) ? 20 : 0) +
    (/<link[^>]+rel=["']stylesheet/i.test(site.html) ? 20 : 0) +
    (sizeKb > 30 ? 20 : 5) +
    40;
  const design = clamp(designSignals - 30); // bias down — most SMB sites look dated

  const ctaSignals =
    (/get a (free )?quote|book now|schedule|call now/i.test(site.html) ? 30 : 0) +
    (/tel:/i.test(site.html) ? 25 : 0) +
    (/<form\b/i.test(site.html) ? 25 : 0) +
    10;
  const conversion = clamp(ctaSignals);

  // Reviews boost overall: 4.5+ stars w/ 50+ reviews adds trust signal
  const reviewBonus =
    p.rating && p.review_count && p.rating >= 4.5 && p.review_count >= 50 ? 10 : 0;
  const overall = clamp(Math.round((speed + design + seo + conversion) / 4) + reviewBonus);

  return { speed, design, seo, conversion, overall };
}

function clamp(n: number): number { return Math.max(1, Math.min(100, Math.round(n))); }

// ---------- Competitor benchmark via Places ----------

async function findCompetitors(p: Prospect): Promise<CompetitorBenchmark[]> {
  if (!p.city || !p.category) return [];
  const list = await discoverFromPlaces({
    query: `${p.category} in ${p.city}${p.state ? ", " + p.state : ""}`,
    category: p.category,
    maxResults: 6,
  });
  const others = list
    .filter((b) => b.business_name.toLowerCase() !== p.business_name.toLowerCase())
    .slice(0, 3);
  return others.map((c) => {
    const edge = compareEdge(p, c);
    return {
      name: c.business_name,
      rating: c.rating,
      review_count: c.review_count,
      has_website: Boolean(c.website_url),
      edge,
    };
  });
}

function compareEdge(p: Prospect, c: { rating: number | null; review_count: number | null; website_url: string | null }): string {
  const parts: string[] = [];
  if ((c.review_count ?? 0) > (p.review_count ?? 0)) {
    parts.push(`${c.review_count ?? 0} reviews vs your ${p.review_count ?? 0}`);
  }
  if ((c.rating ?? 0) > (p.rating ?? 0)) {
    parts.push(`${c.rating}★ vs your ${p.rating ?? "n/a"}`);
  }
  if (c.website_url && !p.website_url) parts.push("has a website, you don't");
  return parts.join(" · ") || "comparable size, room to leapfrog";
}

// ---------- AI narrative ----------

interface NarrativeInput {
  business_name: string;
  category: string | null;
  city: string | null;
  has_website: boolean;
  website_title: string | null;
  website_meta: string | null;
  detected_services: string[];
  rating: number | null;
  review_count: number | null;
  scores: Scores;
  competitors: CompetitorBenchmark[];
}

interface Narrative {
  summary: string;
  weaknesses: string[];
  opportunities: string[];
}

async function generateScanNarrative(i: NarrativeInput): Promise<Narrative> {
  const system =
    "You are a digital-marketing analyst writing a short, blunt audit for a local-service business. " +
    "Tone: confident, specific, no fluff. Output VALID JSON only, no preamble.";

  const user = `Analyze this business and return JSON:
{
  "summary": "2-3 sentence plain-English summary of their current digital presence",
  "weaknesses": ["3-5 specific, observable weaknesses"],
  "opportunities": ["3-5 actionable opportunities tied to the weaknesses"]
}

BUSINESS: ${i.business_name}
CATEGORY: ${i.category ?? "unknown"}
CITY: ${i.city ?? "unknown"}
HAS_WEBSITE: ${i.has_website}
SITE_TITLE: ${i.website_title ?? "(none)"}
SITE_META: ${i.website_meta ?? "(none)"}
DETECTED_SERVICES: ${JSON.stringify(i.detected_services)}
GOOGLE_RATING: ${i.rating ?? "n/a"} (${i.review_count ?? 0} reviews)
SCORES: speed=${i.scores.speed} design=${i.scores.design} seo=${i.scores.seo} conversion=${i.scores.conversion} overall=${i.scores.overall}
COMPETITORS: ${JSON.stringify(i.competitors)}

Return ONLY JSON, nothing else.`;

  try {
    const raw = await generateText({ system, user, maxTokens: 800 });
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as Narrative;
    return {
      summary: parsed.summary ?? "",
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 6) : [],
    };
  } catch {
    return fallbackNarrative(i);
  }
}

export function extractJson(s: string): string {
  // Strip ```json fences if present.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  if (fenced) return fenced[1].trim();
  // Else grab from first { to last }.
  const first = s.indexOf("{");
  const last  = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return s.trim();
}

function fallbackNarrative(i: NarrativeInput): Narrative {
  const weaknesses: string[] = [];
  if (!i.has_website) weaknesses.push("No website at all — invisible to Google search.");
  if (i.scores.seo < 50) weaknesses.push("Weak on-page SEO — missing meta tags and structured headings.");
  if (i.scores.conversion < 50) weaknesses.push("No clear call-to-action — visitors can't easily request a quote.");
  if (i.scores.design < 50) weaknesses.push("Dated visual design that erodes trust before the pitch starts.");
  if ((i.review_count ?? 0) < 25) weaknesses.push("Thin review base — social proof is hurting close rate.");
  return {
    summary: `${i.business_name} is a ${i.category ?? "local business"}${i.city ? " in " + i.city : ""} with ${i.review_count ?? 0} Google reviews. Their digital presence scores ${i.scores.overall}/100 — meaningful gap vs local competitors that we can close in a week.`,
    weaknesses,
    opportunities: [
      "Launch a conversion-focused single-page site with click-to-call and quote form.",
      "Run Google Local Service Ads targeted at high-intent searches in their service area.",
      "Add structured review schema to surface stars in Google results.",
      "Retargeting on Meta for visitors who don't convert on first touch.",
    ],
  };
}
