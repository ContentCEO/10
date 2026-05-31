import { NextResponse, type NextRequest } from "next/server";

// Public marketing site — no auth required. Middleware only sets
// security headers + handles trailing slashes. No Supabase session
// logic since none of these pages need a signed-in user.
export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  void request;
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
