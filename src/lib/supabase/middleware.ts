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
  // Auto-Outreach: rewrite *.{NEXT_PUBLIC_OUTREACH_SITES_DOMAIN} subdomains
  // to /sites/{subdomain}. So acme-plumbing.previews.contractorflow.com
  // serves the generated landing page at /sites/acme-plumbing.
  const sitesDomain = process.env.NEXT_PUBLIC_OUTREACH_SITES_DOMAIN;
  if (sitesDomain) {
    const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
    if (host.endsWith(`.${sitesDomain.toLowerCase()}`) && host !== sitesDomain.toLowerCase()) {
      const sub = host.slice(0, -1 - sitesDomain.length);
      if (sub && sub !== "www") {
        const url = request.nextUrl.clone();
        if (!url.pathname.startsWith("/sites/") && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_next")) {
          url.pathname = `/sites/${sub}${url.pathname === "/" ? "" : url.pathname}`;
          return NextResponse.rewrite(url);
        }
      }
    }
  }

  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") ?? "";
  const isDesktop =
    ua.includes("Tauri") ||
    ua.includes("ContractorFlow") ||
    request.headers.get("x-contractorflow-desktop") === "1";

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
    path.startsWith("/quote") ||
    path.startsWith("/pros") ||
    path.startsWith("/for-pros") ||
    path.startsWith("/find-pro") ||
    path.startsWith("/preview/") ||
    path.startsWith("/portal/") ||
    path.startsWith("/fsr/") ||
    path === "/tools/estimate" || path.startsWith("/tools/estimate/") ||
    path.startsWith("/nps/") || path === "/api/nps" ||
    path.startsWith("/thanks/") ||
    // Auto-Outreach: public-facing prospect sites + their claim/webhook endpoints.
    path.startsWith("/sites/") ||
    path === "/api/auto-outreach/claim" ||
    path === "/api/auto-outreach/stripe-webhook" ||
    path === "/api/auto-outreach/unsubscribe" ||
    path.startsWith("/api/auto-outreach/track/");

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
