// Public unsubscribe — link in every outbound email + SMS reply STOP handler.
// Marks prospect.do_not_contact = true so the pipeline skips them.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function unsubscribe(token: string) {
  if (!token) return false;
  // token is the prospect_id (UUID); validated by FK lookup.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ao_prospects")
    .update({ do_not_contact: true, outreach_status: "unsubscribed" })
    .eq("id", token)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const ok = await unsubscribe(token);
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui;padding:48px;max-width:560px;margin:auto;text-align:center">
      <h1>${ok ? "Unsubscribed" : "Not found"}</h1>
      <p>${ok ? "You won't hear from us again. Thanks for letting us know." : "We couldn't find that record — you may already be unsubscribed."}</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const ok = await unsubscribe(token ?? "");
  return NextResponse.json({ ok });
}
