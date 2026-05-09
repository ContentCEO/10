import { NextResponse } from "next/server";
import { getBusiness, listCompetitors } from "@/lib/data";
import { generateJson, isAiConfigured } from "@/lib/ai";

type Insight = { area: string; you: string; them: string; gap: string };
type Compare = { summary: string; insights: Insight[] };

const SYSTEM = `You are a local SEO analyst. Given a business and its competitors, identify the
biggest gaps and opportunities. Be concrete and actionable. If competitor info is sparse, infer
likely strengths/weaknesses from typical local SEO patterns.`;

function sampleCompare(name: string): Compare {
  return {
    summary: `${name} is competitive on service quality but trails competitors on review volume and city-targeted content. Closing those two gaps would be the fastest path to better local pack visibility.`,
    insights: [
      { area: "GBP categories", you: "Generic primary category", them: "Specific primary + 2 secondaries", gap: "Tighten primary; add secondary categories." },
      { area: "Review volume", you: "Low velocity", them: "Steady, recent reviews", gap: "Launch automated post-service review request." },
      { area: "City pages", you: "Single homepage", them: "Multiple city/service pages", gap: "Build 3 targeted landing pages." },
      { area: "Photos", you: "Few photos on GBP", them: "Frequent photo uploads", gap: "Add a weekly photo cadence." },
    ],
  };
}

export async function POST(req: Request) {
  const { businessId } = (await req.json()) as { businessId: string };
  if (!businessId) return new NextResponse("businessId required", { status: 400 });
  const business = await getBusiness(businessId);
  if (!business) return new NextResponse("not found", { status: 404 });
  const competitors = await listCompetitors(business.id);

  let result: Compare | null = null;
  if (isAiConfigured) {
    const prompt = `Compare this business against its competitors and surface gaps.

You: ${business.name} (${business.category ?? "n/a"}) in ${business.city ?? "n/a"}.
Website: ${business.website ?? "n/a"}, GBP: ${business.gbp_url ?? "n/a"}.
Description: ${business.description ?? "n/a"}.

Competitors:
${competitors.map((c, i) => `${i + 1}. ${c.name} — site: ${c.website ?? "n/a"}, gbp: ${c.gbp_url ?? "n/a"}, notes: ${c.notes ?? "n/a"}`).join("\n") || "(none provided)"}

Return JSON: { "summary": string, "insights": [{ "area": string, "you": string, "them": string, "gap": string }] }
Provide 4-6 insight rows.`;
    result = await generateJson<Compare>({ system: SYSTEM, prompt, maxTokens: 1500 });
  }

  if (!result) result = sampleCompare(business.name);
  return NextResponse.json(result);
}
