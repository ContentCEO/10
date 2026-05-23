import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auto-outreach/auth";
import { runGenerate, buildPreviewUrl } from "@/lib/auto-outreach/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  const gate = await requireOwner();
  if (gate instanceof NextResponse) return gate;

  const { prospectId } = (await req.json().catch(() => ({}))) as { prospectId?: string };
  if (!prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });

  try {
    const { slug, site } = await runGenerate(prospectId);
    return NextResponse.json({ ok: true, slug, previewUrl: buildPreviewUrl(slug), site });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
