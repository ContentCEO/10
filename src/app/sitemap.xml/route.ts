export const dynamic = "force-static";
export const revalidate = 86400;

// Marketing routes that live in THIS app (CRM). Marketplace + lead-gen
// pages live in contractor-flow-marketplace and have their own sitemap.
const STATIC_PATHS = [
  "/",
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

  const entries = STATIC_PATHS.map((p) => urlEntry(`${base}${p}`, "0.8", "weekly"));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
