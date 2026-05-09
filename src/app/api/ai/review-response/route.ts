import { NextResponse } from "next/server";
import { getBusiness, saveReviewResponse } from "@/lib/data";
import { generateText, isAiConfigured } from "@/lib/ai";

const SYSTEM = `You write professional, on-brand replies to Google Business Profile reviews for local
businesses. Keep replies concise (2-4 sentences). Address specifics from the review when present.
For negative reviews, acknowledge, take responsibility where appropriate, and invite the customer
to continue the conversation offline. Avoid generic platitudes.`;

function sampleReply(business: string, tone: string, rating: number): string {
  if (rating <= 3) {
    return `Thanks for sharing this feedback — and we're sorry the experience at ${business} fell short. We'd like to make it right; please reach out to our team directly so we can dig into the specifics. We appreciate you giving us the chance to improve.`;
  }
  return `Thank you so much for the kind words! Our team at ${business} works hard to deliver this kind of experience, and reviews like yours make their day. We can't wait to welcome you back soon.`.replace("Thank you so much", tone === "professional" ? "Thank you" : "Thanks so much");
}

export async function POST(req: Request) {
  const { businessId, reviewText, rating, tone, businessName } = (await req.json()) as {
    businessId: string;
    reviewText: string;
    rating: number;
    tone: string;
    businessName: string;
  };
  if (!businessId || !reviewText) return new NextResponse("missing fields", { status: 400 });
  const business = await getBusiness(businessId);
  if (!business) return new NextResponse("not found", { status: 404 });

  let response = "";
  if (isAiConfigured) {
    const prompt = `Business: ${businessName}
Tone: ${tone}
Star rating: ${rating}/5
Review:
"""${reviewText}"""

Write a single reply (no preamble, no headings, no quotes around it).`;
    response = (await generateText({ system: SYSTEM, prompt, maxTokens: 400 })).trim();
  }
  if (!response) response = sampleReply(businessName, tone, rating);

  await saveReviewResponse({
    business_id: business.id,
    review_text: reviewText,
    rating,
    tone,
    response,
  });

  return NextResponse.json({ response });
}
