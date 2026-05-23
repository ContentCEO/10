// Owner-only gate for /api/auto-outreach/* routes. Mirrors the pattern used
// by /api/owner/* — checks Supabase session + OWNER_EMAIL.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export async function requireOwner(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return { email: user.email };
}
