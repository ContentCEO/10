// Shared cron/scraper auth — accepts the secret via Bearer header,
// x-cron-secret header, or ?secret= query param. The last one is what
// lets you test from a browser without curl.
export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET;
  if (!expected) return true; // local dev only — Vercel always sets it
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  if (request.headers.get("x-cron-secret") === expected) return true;
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") === expected) return true;
  } catch {
    /* malformed url */
  }
  return false;
}
