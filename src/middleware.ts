import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, env } from "@/lib/env";

export async function middleware(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) res.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
