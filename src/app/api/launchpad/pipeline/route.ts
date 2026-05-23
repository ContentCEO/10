import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/launchpad/auth";
import { runFullPipeline } from "@/lib/launchpad/pipeline";
import type { Channel } from "@/lib/launchpad/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const gate = await requireOwner();
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as {
    prospectId?: string;
    channel?: Channel;
  };
  if (!body.prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });
  const channel: Channel = body.channel === "sms" ? "sms" : "email";

  try {
    const result = await runFullPipeline(body.prospectId, channel);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pipeline failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
