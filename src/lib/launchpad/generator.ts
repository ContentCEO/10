// AI site + slug generator. Takes a prospect + its scan and emits a fully
// structured SiteContent payload the public template renders from.

import { generateText } from "@/lib/ai";
import type { Prospect, ScanResult, SiteContent } from "./types";
import { extractJson } from "./scanner";

export async function generateSite(p: Prospect, scan: ScanResult): Promise<SiteContent> {
  const system =
    "You are a world-class direct-response copywriter and brand designer building " +
    "a high-converting landing page for a local-service business. Voice: confident, " +
    "warm, locally-rooted. Avoid clichés. Output VALID JSON only.";

  const palette = scan.detected_colors.length
    ? scan.detected_colors.slice(0, 2).join(", ")
    : "(none detected — pick a palette that fits the trade)";

  const user = `Generate a complete landing page payload for this business.

BUSINESS: ${p.business_name}
TRADE: ${p.category ?? "local service"}
CITY: ${p.city ?? "(unknown)"}${p.state ? ", " + p.state : ""}
PHONE: ${p.phone ?? "(none)"}
EMAIL: ${p.email ?? "(none)"}
ADDRESS: ${p.address ?? "(none)"}
GOOGLE_RATING: ${p.rating ?? "n/a"} (${p.review_count ?? 0} reviews)
EXISTING_SITE_SERVICES: ${JSON.stringify(scan.detected_services)}
DETECTED_BRAND_COLORS: ${palette}
SCAN_SUMMARY: ${scan.summary}
OPPORTUNITIES: ${JSON.stringify(scan.opportunities)}

Return ONLY this JSON shape (no commentary):
{
  "theme": {
    "primary": "#hex",
    "accent": "#hex",
    "font": "modern" | "classic" | "bold",
    "style": "minimal" | "bold" | "warm"
  },
  "hero": {
    "headline": "8-12 word benefit-led headline that names the city + trade",
    "sub": "one-sentence value prop (under 25 words)",
    "cta_primary": "2-3 word action verb",
    "cta_secondary": "2-3 word secondary action",
    "badge": "short trust line, e.g. 'Family-Owned · 4.9★ · 312 Reviews'"
  },
  "services": [
    { "title": "service name", "description": "1-sentence benefit", "icon": "wrench|home|hammer|spark|leaf|sparkles|phone|shield" }
  ],
  "about": {
    "title": "Why ${p.business_name}",
    "body": "2-3 short paragraphs, max 90 words total",
    "highlights": ["4-6 short trust signals like 'Licensed & insured', 'Same-day quotes', 'Locally-owned since 2014'"]
  },
  "reviews": [
    { "author": "Realistic first-name last-initial", "quote": "1-2 sentence testimonial in voice of a local customer", "rating": 5 }
  ],
  "faq": [
    { "q": "common question", "a": "1-3 sentence answer" }
  ],
  "contact": {
    "phone": "${p.phone ?? ""}",
    "email": "${p.email ?? ""}",
    "address": "${p.address ?? ""}",
    "hours": "e.g. 'Mon–Sat 7am–7pm · Emergency 24/7'"
  },
  "cta_banner": {
    "headline": "Final-pitch CTA headline",
    "sub": "one supporting sentence",
    "cta": "action verb"
  },
  "seo": {
    "title": "SEO title under 60 chars, includes city + trade",
    "description": "150-160 char meta description with a CTA",
    "keywords": ["6-10 local SEO keywords"]
  }
}

REQUIREMENTS:
- services: 4-6 items
- reviews: exactly 3
- faq: 4-5 items
- highlights: 4-6 items
- Do NOT invent contact details — leave blank if not provided.
- All copy in American English.`;

  const raw = await generateText({ system, user, maxTokens: 3000 });
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as SiteContent;
  return normalizeSiteContent(parsed, p);
}

function normalizeSiteContent(s: SiteContent, p: Prospect): SiteContent {
  // Defensive defaults so the public template never crashes on missing fields.
  return {
    theme: {
      primary: cleanHex(s.theme?.primary) ?? "#0ea5e9",
      accent:  cleanHex(s.theme?.accent)  ?? "#f59e0b",
      font:    s.theme?.font  ?? "modern",
      style:   s.theme?.style ?? "bold",
    },
    hero: {
      headline:      s.hero?.headline      ?? `${p.business_name} — ${p.category ?? "Local Service"}`,
      sub:           s.hero?.sub           ?? "Trusted by your neighbors. Free quote in minutes.",
      cta_primary:   s.hero?.cta_primary   ?? "Get a Free Quote",
      cta_secondary: s.hero?.cta_secondary ?? "Call Now",
      badge:         s.hero?.badge,
    },
    services: (s.services ?? []).slice(0, 6),
    about: {
      title:      s.about?.title      ?? `Why ${p.business_name}`,
      body:       s.about?.body       ?? "",
      highlights: (s.about?.highlights ?? []).slice(0, 6),
    },
    reviews: (s.reviews ?? []).slice(0, 3),
    faq:     (s.faq ?? []).slice(0, 6),
    contact: {
      phone:   p.phone   ?? s.contact?.phone   ?? null,
      email:   p.email   ?? s.contact?.email   ?? null,
      address: p.address ?? s.contact?.address ?? null,
      hours:   s.contact?.hours,
    },
    cta_banner: {
      headline: s.cta_banner?.headline ?? "Ready to get started?",
      sub:      s.cta_banner?.sub      ?? "Free quote, no pressure. We'll be in touch within an hour.",
      cta:      s.cta_banner?.cta      ?? "Request a Quote",
    },
    seo: {
      title:       s.seo?.title       ?? `${p.business_name} | ${p.category ?? "Local Service"} in ${p.city ?? ""}`,
      description: s.seo?.description ?? `${p.business_name} — trusted ${p.category ?? "local"} service${p.city ? " in " + p.city : ""}. Call or request a free quote.`,
      keywords:    (s.seo?.keywords ?? []).slice(0, 12),
    },
  };
}

function cleanHex(v: string | undefined): string | null {
  if (!v) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(v.trim());
  return m ? `#${m[1].toLowerCase()}` : null;
}

// Slug: stable, URL-safe, includes city for SEO.
export function slugFor(p: Prospect): string {
  const base = [p.business_name, p.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return base || `prospect-${p.id.slice(0, 8)}`;
}
