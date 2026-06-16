import Link from "next/link";
import { ArrowRight, Bell, Filter, MapPin, Phone, Sliders, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMERALD = "#10b981";

interface Lead {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  zip: string | null;
  ai_score: number | null;
  budget: string | null;
  created_at: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: { welcome?: string; plan?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Auth handled by middleware + layout.

  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: leads } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,zip,ai_score,budget,created_at")
    .eq("status", "available")
    .gte("created_at", sinceIso)
    .not("name", "is", null)
    .not("phone", "is", null)
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (leads ?? []) as Lead[];
  const welcome = searchParams.welcome === "1";

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-2xl p-5"
          style={{ background: `${EMERALD}14`, border: `1px solid ${EMERALD}40` }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: `${EMERALD}22`, color: EMERALD }}>
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg">Welcome to Marketplace 🎉</div>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                You&apos;re on a 7-day free trial. Set your trade + ZIP preferences to start receiving matching leads.
              </p>
              <Link href="/preferences"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: EMERALD, color: "#fff" }}>
                <Sliders className="h-3 w-3" /> Set preferences
              </Link>
            </div>
          </div>
        </div>
      )}

      <header>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color: "#6ee7b7" }}>
          Marketplace · Available now
        </div>
        <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 48, lineHeight: 1.05, letterSpacing: "-0.02em" }} className="mt-2">
          Hey <em style={{ fontStyle: "italic", color: EMERALD }}>{user?.email?.split("@")[0] ?? "there"}</em>.
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          {rows.length} qualified leads in the marketplace right now. Filter by your preferences to see what matches.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatTile label="Available now" value={String(rows.length)} accent={EMERALD} />
        <StatTile label="🔥 Hot (80+ score)" value={String(rows.filter((r) => (r.ai_score ?? 0) >= 80).length)} accent="#f59e0b" />
        <StatTile label="New this week" value={String(rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length)} accent="#a5b4fc" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Latest leads</h2>
        <Link href="/preferences" className="inline-flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: EMERALD }}>
          <Filter className="h-3 w-3" /> Filter by trade + ZIP
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Store className="h-10 w-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.30)" }} />
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
            No qualifying leads in the marketplace right now. Check back in a few hours.
          </div>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {rows.slice(0, 12).map((l) => <LeadCard key={l.id} lead={l} />)}
        </ul>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const hot = (lead.ai_score ?? 0) >= 80;
  return (
    <li className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${hot ? "rgba(245, 158, 11, 0.32)" : "rgba(255,255,255,0.08)"}`,
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{lead.name ?? "—"}</div>
          <div className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            {lead.service_type}{lead.city ? ` · ${lead.city}` : ""}{lead.zip ? ` ${lead.zip}` : ""}
          </div>
          {lead.budget && (
            <div className="mt-1.5 text-xs inline-flex items-center px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.70)" }}>
              {lead.budget}
            </div>
          )}
        </div>
        {hot && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold"
            style={{ background: "rgba(245, 158, 11, 0.16)", color: "#fcd34d" }}>
            🔥 Hot
          </span>
        )}
      </div>
      <Link href={`/dashboard/${lead.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: EMERALD }}>
        View + claim <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}
