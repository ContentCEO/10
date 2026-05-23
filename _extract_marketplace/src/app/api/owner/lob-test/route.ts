import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { sendLobPostcard } from "@/lib/lob";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ ok: false, stage: "auth", error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.LOB_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      error: "LOB_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    });
  }
  const isTestKey = key.startsWith("test_");

  // Send a real postcard to the owner's configured return address —
  // costs ~$0.85 if using a live key; $0 in test mode.
  const result = await sendLobPostcard({
    apiKey: key,
    testMode: isTestKey,
    description: "ContractorFlow Lob connectivity test",
    to: {
      name:          process.env.LOB_FROM_NAME  ?? "ContractorFlow",
      address_line1: process.env.LOB_FROM_LINE1 ?? "1 Main St",
      address_city:  process.env.LOB_FROM_CITY  ?? "Boston",
      address_state: process.env.LOB_FROM_STATE ?? "MA",
      address_zip:   process.env.LOB_FROM_ZIP   ?? "02101",
    },
    vars: {
      first_name:    "Test",
      address_line1: process.env.LOB_FROM_LINE1 ?? "1 Main St",
      project_type:  "test campaign",
      business_name: process.env.LOB_FROM_NAME ?? "ContractorFlow",
      phone:         "(555) 555-0123",
      website:       "contractorflowstore.com",
    },
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      stage: "http",
      status: result.status ?? 0,
      error: result.error,
      test_mode: isTestKey,
    });
  }

  return NextResponse.json({
    ok: true,
    stage: "done",
    test_mode: isTestKey,
    postcard_id: result.data.id,
    expected_delivery: result.data.expected_delivery_date,
    preview_url: result.data.url ?? null,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
