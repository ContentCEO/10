import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Marketplace contractor app. Public marketing routes (homeowner quote
// forms, /local SEO pages, /preview slugs) stay public. Contractor app
// routes (everything under /dashboard, /wallet, /preferences, /account)
// require auth via the Supabase session helper.
export async function middleware(request: NextRequest) {
  const res = await updateSession(request);
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
