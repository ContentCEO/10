import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/launchpad/auth";
import { runDiscover } from "@/lib/launchpad/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireOwner();
  if (gate instanceof NextResponse) return gate;

  let body: { query?: string; category?: string; maxResults?: number };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.query || !body.category) {
    return NextResponse.json({ error: "query and category are required" }, { status: 400 });
  }

  const result = await runDiscover({
    query: body.query,
    category: body.category,
    maxResults: body.maxResults,
  });
  return NextResponse.json({ ok: true, ...result });
}
