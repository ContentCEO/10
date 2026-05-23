import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auto-outreach/auth";
import { runScan } from "@/lib/auto-outreach/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await requireOwner();
  if (gate instanceof NextResponse) return gate;

  const { prospectId } = (await req.json().catch(() => ({}))) as { prospectId?: string };
  if (!prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });

  try {
    const scan = await runScan(prospectId);
    return NextResponse.json({ ok: true, scan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "scan failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
