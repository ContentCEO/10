// 1x1 pixel for email open tracking. Inserted into outbound HTML emails as
// <img src="/api/auto-outreach/track/{logId}" />. We don't currently emit
// HTML emails — this endpoint is wired so we can flip to HTML in one swap.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  await supabase
    .from("ao_outreach_log")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", params.id)
    .is("opened_at", null);

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
