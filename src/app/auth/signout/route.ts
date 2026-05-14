import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function handle(request: Request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Even if Supabase fails, still bounce the user back to /login.
  }
  // 303 See Other forces the browser to switch the follow-up to a GET
  // (the default 307 preserves the POST, which makes /login return 405).
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export async function POST(request: Request) { return handle(request); }
export async function GET(request: Request)  { return handle(request); }

