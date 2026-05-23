import Link from "next/link";
import type { Metadata } from "next";
import { Building2, ChevronLeft, Globe } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 21600; // 6 hours

function titleCase(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: { city: string };
}): Promise<Metadata> {
  const city = titleCase(decodeURIComponent(params.city));
  return {
    title: `${city} building permits — live dashboard | ContractorFlow`,
    description: `Track building permits filed in ${city} this month. Open data, refreshed daily. Find local contractors actively working in your area.`,
    alternates: { canonical: `/permits/${params.city}` },
  };
}

interface LeadRow {
  service_type: string;
  city: string | null;
  zip: string | null;
  budget: string;
  notes: string | null;
  created_at: string;
}

export default async function PermitDashboard({ params }: { params: { city: string } }) {
  const city = titleCase(decodeURIComponent(params.city));
  const admin = createAdminClient();

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin
    .from("marketplace_leads")
    .select("service_type,city,zip,budget,notes,created_at")
    .eq("source_channel", "scraped")
    .ilike("city", `%${city}%`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as LeadRow[];

  const total = rows.length;
  const byBudget: Record<string, number> = {};
  const byZip: Record<string, number> = {};
  const byService: Record<string, number> = {};
  for (const r of rows) {
    byBudget[r.budget] = (byBudget[r.budget] ?? 0) + 1;
    if (r.zip) byZip[r.zip] = (byZip[r.zip] ?? 0) + 1;
    const svc = r.service_type.slice(0, 40);
    byService[svc] = (byService[svc] ?? 0) + 1;
  }
  const topZips    = Object.entries(byZip).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <Link href="/find-pro" className="btn-primary">Get matched with a pro</Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/pros" className="text-sm text-slate-500 inline-flex items-center gap-1 mb-3">
          <ChevronLeft className="h-3.5 w-3.5" /> All pros
        </Link>
        <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
          <Building2 className="h-3 w-3 mr-1" /> Public records · refreshed daily
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
          Building permits in <span className="gradient-text">{city}</span>
        </h1>
        <p className="mt-2 text-slate-600 text-lg">
          {total} active building permits filed in {city} over the last 30 days, based on
          open municipal data. Updated nightly.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10 grid sm:grid-cols-4 gap-3">
        <Tile label="Permits (30d)" value={String(total)} tone="from-indigo-500 to-violet-500" />
        <Tile label="Unique ZIPs" value={String(Object.keys(byZip).length)} tone="from-amber-500 to-orange-500" />
        <Tile label="$15k+ projects" value={String((byBudget["15k_50k"] ?? 0) + (byBudget["over_50k"] ?? 0))} tone="from-emerald-500 to-teal-500" />
        <Tile label="Active services" value={String(Object.keys(byService).length)} tone="from-pink-500 to-rose-500" />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold">Hottest ZIPs</h2>
          {topZips.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No data yet for {city}. Check back tomorrow.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topZips.map(([zip, count]) => (
                <li key={zip} className="flex items-center justify-between">
                  <span className="font-mono">{zip}</span>
                  <span className="text-slate-600">{count} permit{count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Most common project types</h2>
          {topServices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No data yet — the daily scraper will populate this.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topServices.map(([svc, count]) => (
                <li key={svc} className="flex items-center justify-between gap-3">
                  <span className="truncate">{svc}</span>
                  <span className="text-slate-600 shrink-0">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="font-semibold">Recent permits</h2>
        <ul className="mt-3 card divide-y divide-slate-100">
          {rows.slice(0, 20).map((r, i) => (
            <li key={i} className="px-4 py-3 text-sm">
              <div className="font-medium">{r.service_type}</div>
              <div className="text-xs text-slate-500">
                {r.zip ?? "—"} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              The scraper will populate this once it has data for {city}.
            </li>
          )}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-14">
        <div className="card p-6 bg-brand-gradient text-white">
          <h2 className="text-xl font-bold">Need work done in {city}?</h2>
          <p className="mt-1 text-white/90 text-sm">
            Get matched with vetted local contractors. Free quotes, no commitment.
          </p>
          <Link href="/find-pro"
            className="btn mt-4 bg-white text-brand-700 hover:bg-slate-50 inline-flex">
            Get matched with a pro →
          </Link>
        </div>
      </section>

      {/* SEO: schema.org Dataset */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `${city} building permits — last 30 days`,
            description: `Public building permit records for ${city}, updated daily.`,
            keywords: [`${city} permits`, `${city} construction`, "building permits"],
            license: "Public domain",
            isAccessibleForFree: true,
            spatialCoverage: { "@type": "Place", name: city },
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/permits/${params.city}`,
          }),
        }}
      />

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
        Data: city open-records portals · refreshed daily · powered by
        <Link href="/" className="ml-1 text-brand-600">ContractorFlow</Link>
      </footer>
    </main>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 text-xs uppercase tracking-wider text-white/85">{label}</div>
      <div className="relative z-10 mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
