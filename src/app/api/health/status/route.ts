import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / Section B / Idea #16 — System health pills for top bar.
//
// Returns the configured status of every external dependency that ContractorFlow
// depends on. Cheap — just checks env var presence and (for DB) does a single
// SELECT to confirm the connection works.

export async function GET() {
  // Anyone authenticated can poll this — the info is just "is X configured?",
  // no secrets exposed. Unauthenticated clients get 401 to discourage probing.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // DB roundtrip — confirms Supabase is actually reachable, not just configured.
  let db = false;
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
    db = !error;
  } catch { db = false; }

  return NextResponse.json({
    ok: true,
    services: {
      db,
      stripe:    Boolean(process.env.STRIPE_SECRET_KEY),
      twilio:    Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      ai:        Boolean(process.env.ANTHROPIC_API_KEY),
      cron:      Boolean(process.env.CRON_SECRET),
      serpapi:   Boolean(process.env.SERPAPI_KEY),
    },
  });
}
