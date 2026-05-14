export const dynamic = "force-static";

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const sitemap = base ? `${base}/sitemap.xml` : "/sitemap.xml";
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /leads
Disallow: /customers
Disallow: /jobs
Disallow: /invoices
Disallow: /calendar
Disallow: /marketplace
Disallow: /team
Disallow: /lead-gen
Disallow: /integrations
Disallow: /billing
Disallow: /profile
Disallow: /grow
Disallow: /referrals
Disallow: /portal
Disallow: /work
Disallow: /home

Sitemap: ${sitemap}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
