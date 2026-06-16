import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/wallet",
  "/preferences",
  "/account",
  "/leads/claim",
];

const AUTH_ROUTES = ["/login", "/signup", "/auth"];

// Public marketing routes that should NEVER redirect to /login, even when
// Supabase isn't configured. Everything else flows through normal session
// handling.
function isPublicPath(path: string): boolean {
  if (path === "/" || path === "/login" || path === "/signup") return true;
  if (path === "/privacy" || path === "/terms" || path === "/about") return true;
  if (path === "/cost-calculator" || path === "/find-pro" || path === "/pros") return true;
  if (path.startsWith("/quote") || path.startsWith("/for-pros")) return true;
  if (path.startsWith("/local/") || path.startsWith("/preview/")) return true;
  if (path.startsWith("/permits/") || path.startsWith("/book/")) return true;
  if (path.startsWith("/embed/")) return true;
  if (path.startsWith("/l/") || path.startsWith("/i/") || path.startsWith("/r/") || path.startsWith("/p/") || path.startsWith("/yard/")) return true;
  if (path.startsWith("/auth/")) return true;
  if (path.startsWith("/api/marketplace/intake")) return true;
  if (path.startsWith("/api/public/")) return true;
  if (path.startsWith("/api/stripe/webhook")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Build a response we can attach cookies to.
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured — let public routes through, redirect protected
  // ones to /login (they'll see a "configure Supabase" notice there).
  if (!url || !key) {
    if (isPublicPath(path)) return response;
    if (PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
      const redir = request.nextUrl.clone();
      redir.pathname = "/login";
      redir.searchParams.set("next", path);
      return NextResponse.redirect(redir);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh session — this writes new cookies if needed.
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-in users hitting /login or /signup → bounce to dashboard.
  if (user && AUTH_ROUTES.some((p) => path === p || path.startsWith(p + "/")) && !path.startsWith("/auth/")) {
    const redir = request.nextUrl.clone();
    redir.pathname = "/dashboard";
    return NextResponse.redirect(redir);
  }

  // Logged-out users hitting protected routes → bounce to /login.
  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const redir = request.nextUrl.clone();
    redir.pathname = "/login";
    redir.searchParams.set("next", path);
    return NextResponse.redirect(redir);
  }

  return response;
}
