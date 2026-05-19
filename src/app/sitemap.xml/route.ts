import { allSeedPairs } from "@/lib/seo-seed";
import { TRADES } from "@/lib/trades";

export const dynamic = "force-static";
export const revalidate = 86400;

const STATIC_PATHS = [
  "/",
  "/find-pro",
  "/pros",
  "/estimate",
  "/cost-calculator",
  "/quote",
  "/for-pros",
];

// Homeowner-facing cost calculator pages. Mirrors the keys in
// /quote/[trade]/page.tsx — keep in sync if you add more trades.
const QUOTE_TRADES = [
  "kitchen-remodel", "bathroom-remodel", "roofing", "siding", "painting",
  "flooring", "electrical", "plumbing", "hvac", "addition", "basement-finish",
];

function urlEntry(loc: string, priority = "0.7", changefreq = "weekly") {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap-image/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } },
    );
  }

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${base}${p}`, "0.8", "weekly")),
    // Trade-pro recruitment funnels — bid for "[trade] leads MA" searches.
    ...TRADES.map((t) => urlEntry(`${base}/for-pros/${t.slug}`, "0.7", "weekly")),
    // Homeowner cost-calculator quote pages — bid for "[trade] cost MA" searches.
    ...QUOTE_TRADES.map((t) => urlEntry(`${base}/quote/${t}`, "0.7", "weekly")),
    // Programmatic SEO long-tail service × city combos.
    ...allSeedPairs().map((r) => urlEntry(`${base}/local/${r.service}/${r.city}`, "0.5", "monthly")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
