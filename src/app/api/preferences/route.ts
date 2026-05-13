import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/preferences — current user's saved preferences.
// Lightweight, used by PreferencesApplier on first paint.

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ preferences: {} });

  const { data } = await supabase
    .from("profiles").select("preferences").eq("id", user.id).maybeSingle();
  return NextResponse.json({ preferences: (data as { preferences?: Record<string, unknown> } | null)?.preferences ?? {} });
}
