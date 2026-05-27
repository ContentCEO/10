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
  const ua = request.headers.get("user-agent") ?? "";
  const isDesktop =
    ua.includes("Tauri") ||
    ua.includes("ContractorFlow") ||
    request.headers.get("x-contractorflow-desktop") === "1";

  // The marketplace + public-capture routes moved to the new
  // contractor-flow-marketplace app. Anything hitting an old URL here
  // bounces to a "coming soon" page until that app is live.
  const MOVED_PREFIXES = [
    "/marketplace", "/quote", "/for-pros", "/find-pro", "/local",
    "/pros", "/yard", "/book", "/cost-calculator", "/embed",
    "/permits", "/l/", "/i/", "/r/", "/p/",
    "/tools/estimate",
  ];
  if (MOVED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/marketplace-soon";
    url.search = "";
    return NextResponse.redirect(url, { status: 302 });
  }

  // Desktop app should never see the marketing landing. Send it straight
  // to /dashboard, which itself enforces auth and bounces to /login if
  // not signed in. Public marketing routes are for browsers only.
  if (isDesktop && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

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
    path === "/marketplace-soon" ||
    path.startsWith("/api/desktop/") ||
    (path.startsWith("/google") && path.endsWith(".html")) ||
    path.startsWith("/api/sms/") ||
    path.startsWith("/api/booking/") ||
    path.startsWith("/_next") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/diagnostics") ||
    path.startsWith("/api/proposals/sign") ||
    path.startsWith("/preview/") ||
    path.startsWith("/portal/") ||
    path.startsWith("/fsr/") ||
    path.startsWith("/nps/") || path === "/api/nps" ||
    path.startsWith("/thanks/");

  // Skip Supabase entirely for public paths (perf + works without env vars).
  if (isPublic) return response;

  // Graceful degrade for local dev without Supabase env: let protected
  // routes through. Real production envs will always have these set.
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

  // Desktop-only gate, with admin override:
  //   - Admins can access in-app routes from a browser (for management).
  //   - Non-admin users (regular contractor customers) get bounced to
  //     /download unless they're inside the Tauri desktop app.
  // (isDesktop already computed at the top of this function.)
  if (!isDesktop) {
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/download";
      url.searchParams.set("from", "web");
      url.searchParams.set("path", path);
      return NextResponse.redirect(url);
    }
  }

  return response;
}
