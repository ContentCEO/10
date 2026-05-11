import Link from "next/link";
import { Flame, MapPin, ShoppingCart, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  BUDGET_LABELS,
  TIMELINE_LABELS,
  type MarketplaceLead,
} from "@/lib/marketplace";
import { formatDate } from "@/lib/utils";
import { ClaimButton } from "./ClaimButton";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (score >= 50) return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { service?: string; zip?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("marketplace_leads")
    .select("*")
    .eq("status", "available")
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (searchParams.service) query = query.ilike("service_type", `%${searchParams.service}%`);
  if (searchParams.zip)     query = query.eq("zip", searchParams.zip);

  const [{ data: available }, { data: claimed }] = await Promise.all([
    query,
    supabase.from("marketplace_leads").select("*")
      .eq("buyer_id", user.id)
      .order("bought_at", { ascending: false }).limit(20),
  ]);

  const rows = (available ?? []) as MarketplaceLead[];
  const mine  = (claimed ?? []) as MarketplaceLead[];

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lead marketplace</h1>
          <p className="text-sm text-slate-500">
            Fresh homeowner project requests, scored by AI. Claim a lead to add it
            straight to your pipeline.
          </p>
        </div>
        <a href="/find-pro" target="_blank" rel="noreferrer" className="btn-secondary hidden sm:inline-flex">
          <Sparkles className="h-4 w-4" /> See homeowner page
        </a>
      </header>

      <form className="card p-4 grid sm:grid-cols-[1fr_140px_auto] gap-2" action="/marketplace">
        <input name="service" defaultValue={searchParams.service ?? ""}
          className="input" placeholder="Filter by service (e.g. kitchen, roof, clean)" />
        <input name="zip" defaultValue={searchParams.zip ?? ""}
          className="input" placeholder="ZIP" inputMode="numeric" />
        <button className="btn-primary">Filter</button>
      </form>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Available ({rows.length})</h2>
          <span className="text-xs text-slate-500">
            Sorted by AI score · refreshed in real time
          </span>
        </div>

        {rows.length ? (
          <ul className="grid md:grid-cols-2 gap-3">
            {rows.map((l) => (
              <li key={l.id} className="card card-hover p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{l.service_type}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {[l.city, l.zip].filter(Boolean).join(" · ") || "Location not provided"}
                    </div>
                  </div>
                  <span className={`badge ${scoreTone(l.ai_score)}`}>
                    <Flame className="h-3 w-3 mr-1" />
                    {l.ai_score}/100
                  </span>
                </div>

                {l.ai_summary && (
                  <p className="text-sm text-slate-700 italic">"{l.ai_summary}"</p>
                )}

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Budget</dt>
                  <dd className="text-right">{BUDGET_LABELS[l.budget]}</dd>
                  <dt className="text-slate-500">Timeline</dt>
                  <dd className="text-right">{TIMELINE_LABELS[l.timeline]}</dd>
                  <dt className="text-slate-500">Posted</dt>
                  <dd className="text-right">{formatDate(l.created_at)}</dd>
                </dl>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-lg font-bold gradient-text">{money(l.price_cents)}</span>
                  <ClaimButton id={l.id} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center text-sm text-slate-500">
            No leads match that filter right now. Check back soon — the marketplace
            updates as homeowners submit project requests.
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Your claimed leads
          </h2>
          <ul className="card divide-y divide-slate-100">
            {mine.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.name} · {l.service_type}</div>
                  <div className="text-xs text-slate-500">
                    {[l.city, l.zip].filter(Boolean).join(" · ") || "—"} ·
                    Claimed {l.bought_at ? formatDate(l.bought_at) : "—"}
                  </div>
                </div>
                <Link
                  href={`/leads?source=Marketplace`}
                  className="btn-secondary !py-1 text-xs"
                >
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
