import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase email-link callback. After verifying the magic-link token,
// exchange it for a session and send the contractor to /dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Verification link expired or invalid")}`);
}
