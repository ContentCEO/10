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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/manifest.webmanifest" ||
    path === "/icon.svg" ||
    path === "/sw.js" ||
    path === "/cost-calculator" ||
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
    path.startsWith("/api/public/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/scrape/") ||
    path.startsWith("/api/voice/") ||
    path.startsWith("/api/diagnostics") ||
    path.startsWith("/embed/") ||
    path.startsWith("/l/") ||
    path.startsWith("/i/") ||
    path.startsWith("/r/") ||
    path.startsWith("/local/") ||
    path.startsWith("/pros") ||
    path.startsWith("/find-pro");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
