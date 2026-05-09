import { NextResponse } from "next/server";
import { createAudit, getBusiness } from "@/lib/data";
import { generateJson, isAiConfigured } from "@/lib/ai";
import type { AuditFinding, AuditPlanItem } from "@/lib/types";

type AiAudit = {
  score: number;
  summary: string;
  findings: AuditFinding[];
  plan: AuditPlanItem[];
};

const SYSTEM = `You are a senior local SEO consultant. You analyze a small business and produce
a concise, accurate, prioritized audit. Focus on Google Business Profile, on-page SEO,
local citations, reviews, content, and technical fundamentals. Be specific, not generic.`;

function sample(name: string): AiAudit {
  return {
    score: 62,
    summary: `${name} has solid foundations but is missing key local SEO signals. Tightening Google Business Profile and adding location-targeted content should yield the fastest wins.`,
    findings: [
      { area: "GBP", severity: "high", issue: "Primary category is too generic", recommendation: "Set the most specific category, then add 2–3 secondary categories that match your top services." },
      { area: "On-page", severity: "high", issue: "Page titles missing city + service", recommendation: "Update homepage and top service pages to include both your primary service and city." },
      { area: "Reviews", severity: "medium", issue: "Review velocity is below local competitors", recommendation: "Set up a request flow that asks happy customers within 24 hours of service." },
      { area: "Citations", severity: "medium", issue: "Inconsistent NAP across directories", recommendation: "Audit Yelp, BBB, Apple Maps, and Bing Places; align name, address, phone exactly." },
      { area: "Technical", severity: "low", issue: "Missing LocalBusiness schema", recommendation: "Add JSON-LD schema with address, geo, openingHours, and sameAs links." },
    ],
    plan: [
      { step: 1, title: "Tighten Google Business Profile", detail: "Specific primary category, full services list, weekly photos, and posts.", effort: "low", impact: "high" },
      { step: 2, title: "Rewrite homepage + top service titles", detail: "Pattern: '[Service] in [City] | [Brand]'. Add NAP and embed map.", effort: "low", impact: "high" },
      { step: 3, title: "Launch a review request flow", detail: "Automated SMS/email with a direct GBP review link the day after service.", effort: "medium", impact: "high" },
      { step: 4, title: "Build 3 city × service landing pages", detail: "Unique copy, embedded map, testimonials, FAQ, schema.", effort: "medium", impact: "high" },
      { step: 5, title: "Citation cleanup pass", detail: "Fix top 15 directories; standardize NAP and primary category.", effort: "medium", impact: "medium" },
    ],
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as { businessId?: string };
  const businessId = body.businessId;
  if (!businessId) return new NextResponse("businessId required", { status: 400 });
  const business = await getBusiness(businessId);
  if (!business) return new NextResponse("not found", { status: 404 });

  let result: AiAudit | null = null;
  if (isAiConfigured) {
    const prompt = `Audit the local SEO posture of this business.

Business profile:
- Name: ${business.name}
- Category: ${business.category ?? "unspecified"}
- Website: ${business.website ?? "none"}
- Google Business Profile: ${business.gbp_url ?? "none"}
- Phone: ${business.phone ?? "n/a"}
- Address: ${[business.address, business.city, business.region, business.postal_code, business.country].filter(Boolean).join(", ") || "n/a"}
- Service area: ${business.service_area ?? "n/a"}
- Primary keyword: ${business.primary_keyword ?? "n/a"}
- Description: ${business.description ?? "n/a"}

Return JSON with this exact shape:
{
  "score": number 0-100,
  "summary": string (2-3 sentences),
  "findings": [{ "area": string, "severity": "critical"|"high"|"medium"|"low", "issue": string, "recommendation": string }],
  "plan": [{ "step": number, "title": string, "detail": string, "effort": "low"|"medium"|"high", "impact": "low"|"medium"|"high" }]
}
Provide 5-8 findings and 5-8 plan items.`;

    result = await generateJson<AiAudit>({ system: SYSTEM, prompt, maxTokens: 2500 });
  }

  if (!result) result = sample(business.name);

  const audit = await createAudit({
    business_id: business.id,
    score: result.score,
    summary: result.summary,
    findings: result.findings,
    plan: result.plan,
  });

  return NextResponse.json(audit);
}
