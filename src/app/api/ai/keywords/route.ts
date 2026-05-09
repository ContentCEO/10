import { NextResponse } from "next/server";
import { bulkInsertKeywords, getBusiness } from "@/lib/data";
import { generateJson, isAiConfigured } from "@/lib/ai";

type KeywordIdeaJson = { keyword: string; intent: string; difficulty: string; rationale: string };

const SYSTEM = `You generate local-intent keyword ideas for small businesses. Focus on long-tail
queries that real customers in the service area would type. Mix transactional, informational,
and "near me" patterns. Be specific to the business's services and city.`;

function sampleIdeas(name: string, city: string | null, kw: string | null): KeywordIdeaJson[] {
  const place = city ?? "your city";
  const seed = kw ?? "service";
  return [
    { keyword: `${seed} near me`, intent: "transactional", difficulty: "medium", rationale: "High intent, classic local query." },
    { keyword: `best ${seed} in ${place}`, intent: "transactional", difficulty: "high", rationale: "Comparison shopper, big payoff if ranked." },
    { keyword: `${seed} ${place} reviews`, intent: "transactional", difficulty: "medium", rationale: "Late-funnel; rank with strong reviews + GBP." },
    { keyword: `affordable ${seed} ${place}`, intent: "transactional", difficulty: "low", rationale: "Price-sensitive segment, easier to win." },
    { keyword: `${seed} cost ${place}`, intent: "informational", difficulty: "low", rationale: "Pricing transparency draws long-tail traffic." },
    { keyword: `same day ${seed} ${place}`, intent: "transactional", difficulty: "medium", rationale: "Urgency-driven query." },
    { keyword: `${name} hours`, intent: "navigational", difficulty: "low", rationale: "Brand query — own it on GBP and homepage." },
  ];
}

export async function POST(req: Request) {
  const { businessId, count = 15 } = (await req.json()) as { businessId: string; count?: number };
  if (!businessId) return new NextResponse("businessId required", { status: 400 });
  const business = await getBusiness(businessId);
  if (!business) return new NextResponse("not found", { status: 404 });

  let ideas: KeywordIdeaJson[] | null = null;
  if (isAiConfigured) {
    const prompt = `Generate ${count} local-intent keyword ideas for:
- Business: ${business.name}
- Category: ${business.category ?? "general local business"}
- City: ${business.city ?? "n/a"} / Service area: ${business.service_area ?? "n/a"}
- Primary keyword: ${business.primary_keyword ?? "n/a"}
- Description: ${business.description ?? "n/a"}

Return JSON array, each item: { "keyword", "intent" (transactional|informational|navigational), "difficulty" (low|medium|high), "rationale" }`;
    ideas = await generateJson<KeywordIdeaJson[]>({ system: SYSTEM, prompt, maxTokens: 1500 });
  }
  if (!ideas) ideas = sampleIdeas(business.name, business.city, business.primary_keyword);

  await bulkInsertKeywords(
    ideas.map((k) => ({
      business_id: business.id,
      keyword: k.keyword,
      intent: k.intent,
      difficulty: k.difficulty,
      rationale: k.rationale,
    })),
  );

  return NextResponse.json({ count: ideas.length });
}
