import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI ballpark estimate from a photo. POST /api/ai/photo-estimate
// Body: { image_url, service?, region? }
//
// Claude looks at the photo and returns a {low, high, confidence,
// notes} estimate. Explicitly a ballpark — never a quote.

interface Body { image_url?: string; service?: string; region?: string }

interface Estimate {
  low: number;
  high: number;
  confidence: "low" | "medium" | "high";
  scope_seen: string;
  caveats: string[];
}

const SYSTEM = `You are a contractor estimator. Look at a job photo
and produce a ballpark price range. Be conservative. Be honest about
what you can't tell from the photo.

Return EXACTLY this JSON:
{
  "low": 0,
  "high": 0,
  "confidence": "low" | "medium" | "high",
  "scope_seen": "string · 1 sentence describing what you see",
  "caveats": ["string", ...] · what you'd need to know to firm up the price
}

Rules:
- low/high are integer USD
- "confidence: high" only when the scope is obvious and standard
- Always include 2-4 caveats — what would change the number
- US labor rates ($50-150/hr depending on trade)
- Materials priced 2026 rough averages
- No markdown, no preamble. Just JSON.`;

function parseEstimate(text: string): Estimate | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (typeof obj.low !== "number" || typeof obj.high !== "number") return null;
    return obj as Estimate;
  } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as Body | null;
  const url = body?.image_url?.trim();
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "image_url (http/https) required" }, { status: 400 });
  }

  const contextLines = [
    body?.service ? `Job type: ${body.service}` : null,
    body?.region ? `Region: ${body.region}` : "Region: US (mixed metro)",
    "Give me a ballpark price range for this job.",
  ].filter(Boolean) as string[];

  // Fetch the image and base64-encode (the installed SDK requires
  // base64 source rather than URL).
  let imageB64 = "";
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
    const ct = imgRes.headers.get("content-type") ?? "";
    if (ct.includes("png"))       mediaType = "image/png";
    else if (ct.includes("webp")) mediaType = "image/webp";
    else if (ct.includes("gif"))  mediaType = "image/gif";
    const buf = await imgRes.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (5MB max)" }, { status: 400 });
    }
    imageB64 = Buffer.from(buf).toString("base64");
  } catch (e) {
    return NextResponse.json({
      error: `Couldn't fetch image: ${e instanceof Error ? e.message : "unknown"}`,
    }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageB64 } },
          { type: "text", text: contextLines.join("\n") },
        ],
      }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const estimate = parseEstimate(text.text);
    if (!estimate) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, estimate });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
