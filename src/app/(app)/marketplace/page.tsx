import Link from "next/link";
import { ShoppingCart, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { type MarketplaceLead } from "@/lib/marketplace";
import { formatDate } from "@/lib/utils";
import { isOwnerEmail } from "@/lib/owner";
import { DisputeButton } from "./DisputeButton";
import { WalletBar } from "./WalletBar";
import { MarketplaceCard } from "./MarketplaceCard";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { service?: string; zip?: string; topup?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Owner + admins see uncurated scraped leads too; everyone else gets
  // the curated firehose. This is what makes the scraped pipeline
  // visible in /marketplace immediately for the platform owner.
  const { data: viewerProfile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const seeAll = isOwnerEmail(user.email) || Boolean((viewerProfile as { is_admin?: boolean } | null)?.is_admin);

  let query = supabase
    .from("marketplace_leads")
    .select("*")
    .eq("status", "available")
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(seeAll ? 200 : 50);
  if (!seeAll) {
    query = query.or("requires_curation.is.null,requires_curation.eq.false");
  }

  if (searchParams.service) query = query.ilike("service_type", `%${searchParams.service}%`);
  if (searchParams.zip)     query = query.eq("zip", searchParams.zip);

  const [{ data: available }, { data: claimed }, { data: profile }] = await Promise.all([
    query,
    supabase.from("marketplace_leads").select("*")
      .eq("buyer_id", user.id)
      .order("bought_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("credit_cents").eq("id", user.id).single(),
  ]);

  const rows    = (available ?? []) as MarketplaceLead[];
  const mine    = (claimed ?? []) as MarketplaceLead[];
  const balance = profile?.credit_cents ?? 0;
  const hotCount = rows.filter((r) => r.ai_score >= 80).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <span className="section-eyebrow"><Store className="h-3.5 w-3.5" /> Marketplace</span>
            <h1 className="mt-2 display-h2">Lead marketplace</h1>
            <p className="mt-2 text-sm text-ink-600">
              Fresh homeowner project requests, scored by AI. Claim a lead — your wallet
              is charged automatically.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
                {rows.length} available
              </span>
              {hotCount > 0 && (
                <span className="badge bg-rose-100 text-rose-700 ring-rose-200">
                  🔥 {hotCount} hot
                </span>
              )}
            </div>
          </div>
          <a href="/find-pro" target="_blank" rel="noreferrer" className="btn-secondary hidden sm:inline-flex shrink-0">
            <Sparkles className="h-4 w-4" /> Homeowner view
          </a>
        </div>
      </header>

      {searchParams.topup === "success" && (
        <div className="card p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-sm">
          ✅ Top-up successful! Your wallet will reflect the new balance once Stripe finishes processing
          (usually a few seconds). Refresh if you don&apos;t see it yet.
        </div>
      )}

      <WalletBar balanceCents={balance} />

      <form className="card p-4 grid sm:grid-cols-[1fr_140px_auto] gap-2" action="/marketplace">
        <input name="service" defaultValue={searchParams.service ?? ""}
          className="input" placeholder="Filter by service (e.g. kitchen, roof, clean)" />
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="input" placeholder="ZIP" inputMode="numeric" />
        <button className="btn-primary">Filter</button>
      </form>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Available now</h2>
          <span className="text-xs text-ink-500">Sorted by AI score</span>
        </div>

        {rows.length ? (
          <ul className="grid md:grid-cols-2 gap-4">
            {rows.map((l) => (
              <MarketplaceCard key={l.id} lead={l} balanceCents={balance} />
            ))}
          </ul>
        ) : (
          <div className="card p-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow mb-4">
              <Store className="h-6 w-6" />
            </div>
            <p className="text-sm text-ink-600 max-w-sm mx-auto">
              No leads match that filter right now. Try the <strong>Seed samples</strong> button
              above to generate 5 AI-crafted sample leads for testing.
            </p>
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <section>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Your claimed leads
          </h2>
          <ul className="card divide-y divide-ink-100">
            {mine.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-ink-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{l.name} · {l.service_type}</div>
                  <div className="text-xs text-ink-500">
                    {[l.city, l.zip].filter(Boolean).join(" · ") || "—"} ·
                    Claimed {l.bought_at ? formatDate(l.bought_at) : "—"} ·
                    {" "}<span className="tabular-nums font-medium text-ink-700">{money(l.price_cents)}</span>
                  </div>
                  <DisputeButton leadId={l.id} />
                </div>
                <Link href={`/leads?source=Marketplace`} className="btn-secondary !py-1.5 text-xs shrink-0">
                  Open in pipeline
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
