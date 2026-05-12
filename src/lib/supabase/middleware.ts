import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/find-pro",
  "/api/stripe/webhook",
  "/api/marketplace/intake",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/manifest.webmanifest" ||
    path === "/icon.svg" ||
    path === "/icon-192.png" ||
    path === "/icon-512.png" ||
    path === "/icon-maskable.png" ||
    path === "/sw.js" ||
    path === "/offline" ||
    path === "/download" ||
    path === "/cost-calculator" ||
    path.startsWith("/api/desktop/") ||
    (path.startsWith("/google") && path.endsWith(".html")) ||
    path.startsWith("/permits/") ||
    path.startsWith("/book/") ||
    path.startsWith("/api/sms/") ||
    path.startsWith("/api/booking/") ||
    path.startsWith("/_next") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/marketplace/intake") ||
    path.startsWith("/api/marketplace/webhook") ||
    path.startsWith("/api/marketplace/google-ads") ||
    path.startsWith("/api/marketplace/meta") ||
    path.startsWith("/api/marketplace/auto-bid") ||
    path.startsWith("/api/public/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/scrape/") ||
    path.startsWith("/api/scrape/trigger-if-stale") ||
    path.startsWith("/api/voice/") ||
    path === "/api/voice/twilio-recording" ||
    path.startsWith("/api/diagnostics") ||
    path.startsWith("/embed/") ||
    path.startsWith("/l/") ||
    path.startsWith("/i/") ||
    path.startsWith("/r/") ||
    path.startsWith("/p/") ||
    path.startsWith("/api/proposals/sign") ||
    path.startsWith("/yard/") ||
    path.startsWith("/local/") ||
    path.startsWith("/pros") ||
    path.startsWith("/find-pro") ||
    path.startsWith("/preview/");

  // Skip Supabase entirely for public paths (perf + works without env vars).
  if (isPublic) return response;

  // Desktop-only gate: the in-app screens are not reachable from a regular
  // browser. The Tauri shell identifies itself with "Tauri Desktop" in the
  // User-Agent string (see src-tauri/tauri.conf.json `userAgent`). Anything
  // else gets bounced to /download with a notice. This is a UX gate, not a
  // hard security boundary — protected routes still enforce Supabase auth
  // below for any client that does slip through.
  const ua = request.headers.get("user-agent") ?? "";
  const isDesktop =
    ua.includes("Tauri") ||
    ua.includes("ContractorFlow") ||
    request.headers.get("x-contractorflow-desktop") === "1";

  if (!isDesktop) {
    const url = request.nextUrl.clone();
    url.pathname = "/download";
    url.searchParams.set("from", "web");
    url.searchParams.set("path", path);
    return NextResponse.redirect(url);
  }

  // Graceful degrade for local dev without Supabase env: let protected
  // routes through. Real production envs will always have these set; this
  // only triggers when someone previews the app without configuring secrets.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: CookieToSet[]) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
