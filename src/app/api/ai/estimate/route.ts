import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SYSTEM = `You generate ballpark project estimates for homeowners based on a
description and (optionally) photos. Output a single JSON object with these keys:
- "low" — integer dollar amount, low end of range
- "high" — integer dollar amount, high end of range
- "summary" — 2-3 short sentences explaining the range and what drives it
- "factors" — array of 3-5 short strings describing what would push the price up or down
- "caveats" — array of 2-3 short strings about why this is approximate (location,
  materials, hidden conditions, etc.)
Return numbers, not strings, for low/high. No prose outside the JSON, no markdown.

Estimates are rough order-of-magnitude only. Do not produce binding quotes; remind
the user a real contractor must inspect to give a real quote.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

interface EstimateBody {
  service_type?: unknown;
  details?:      unknown;
  city?:         unknown;
  zip?:          unknown;
  photo_urls?:   unknown;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 500 });
  }

  const body: EstimateBody = await request.json().catch(() => ({}));
  const service = typeof body.service_type === "string" ? body.service_type.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (!service) return NextResponse.json({ error: "service_type required" }, { status: 400 });

  const city = typeof body.city === "string" ? body.city.trim() : "";
  const zip  = typeof body.zip  === "string" ? body.zip.trim()  : "";
  const photoUrls = Array.isArray(body.photo_urls)
    ? (body.photo_urls as unknown[]).filter((u): u is string => typeof u === "string").slice(0, 5)
    : [];

  type Block =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "url"; url: string } };

  const content: Block[] = [
    {
      type: "text",
      text:
`Service: ${service}
Details: ${details || "(none)"}
Location: ${[city, zip].filter(Boolean).join(", ") || "(not provided)"}
Photos provided: ${photoUrls.length}

Return the JSON now.`,
    },
  ];
  for (const url of photoUrls) {
    content.push({ type: "image", source: { type: "url", url } });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let raw = "";
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text");
    raw = text && text.type === "text" ? text.text : "";
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI failed" },
      { status: 500 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return NextResponse.json({ error: "Could not parse AI response" }, { status: 502 });
  }

  return NextResponse.json({
    low:      typeof parsed.low  === "number" ? Math.round(parsed.low)  : null,
    high:     typeof parsed.high === "number" ? Math.round(parsed.high) : null,
    summary:  typeof parsed.summary === "string" ? parsed.summary : "",
    factors:  Array.isArray(parsed.factors)  ? (parsed.factors  as unknown[]).filter((x): x is string => typeof x === "string") : [],
    caveats:  Array.isArray(parsed.caveats)  ? (parsed.caveats  as unknown[]).filter((x): x is string => typeof x === "string") : [],
  });
}
