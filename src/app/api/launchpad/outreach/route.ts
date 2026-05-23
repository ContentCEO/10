import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/launchpad/auth";
import { runOutreach } from "@/lib/launchpad/pipeline";
import type { Channel } from "@/lib/launchpad/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await requireOwner();
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as {
    prospectId?: string;
    channel?: Channel;
    campaignId?: string;
  };
  if (!body.prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });
  if (body.channel !== "email" && body.channel !== "sms") {
    return NextResponse.json({ error: "channel must be 'email' or 'sms'" }, { status: 400 });
  }

  const result = await runOutreach(body.prospectId, body.channel, body.campaignId ?? null);
  return NextResponse.json(result);
}
