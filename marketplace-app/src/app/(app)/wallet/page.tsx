import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, CircleDollarSign, Plus, ShoppingCart, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMERALD = "#10b981";

interface Transaction {
  id: string;
  amount_cents: number;
  kind: "topup" | "purchase" | "credit" | "refund";
  description: string | null;
  reference: string | null;
  created_at: string;
}

interface ClaimedLead {
  id: string;
  service_type: string;
  city: string | null;
  zip: string | null;
  price_cents: number;
  bought_at: string;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1)    return "Just now";
  if (min < 60)   return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)     return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const KIND_TONE: Record<Transaction["kind"], { color: string; label: string; bg: string; ring: string }> = {
  topup:    { color: "#34d399", label: "Top-up",   bg: "rgba(16,185,129,0.10)", ring: "rgba(16,185,129,0.28)" },
  credit:   { color: "#34d399", label: "Credit",   bg: "rgba(16,185,129,0.10)", ring: "rgba(16,185,129,0.28)" },
  refund:   { color: "#fcd34d", label: "Refund",   bg: "rgba(252,211,77,0.10)", ring: "rgba(252,211,77,0.28)" },
  purchase: { color: "#fb7185", label: "Claim",    bg: "rgba(251,113,133,0.10)", ring: "rgba(251,113,133,0.28)" },
};

export default async function WalletPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const [
    { data: profile },
    { data: txns },
    { data: claimedRaw },
  ] = await Promise.all([
    admin.from("profiles").select("credit_cents").eq("id", user.id).maybeSingle(),
    admin.from("wallet_transactions")
      .select("id,amount_cents,kind,description,reference,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    admin.from("marketplace_leads")
      .select("id,service_type,city,zip,price_cents,bought_at")
      .eq("buyer_id", user.id)
      .not("bought_at", "is", null)
      .order("bought_at", { ascending: false })
      .limit(30),
  ]);

  const balanceCents = (profile as { credit_cents?: number } | null)?.credit_cents ?? 0;
  const transactions = (txns ?? []) as Transaction[];
  const claimed = (claimedRaw ?? []) as ClaimedLead[];

  const last30Spent = claimed
    .filter((l) => Date.now() - new Date(l.bought_at).getTime() < 30 * 86400000)
    .reduce((s, l) => s + l.price_cents, 0);
  const last30Claims = claimed.filter((l) => Date.now() - new Date(l.bought_at).getTime() < 30 * 86400000).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ───── HERO BALANCE ─────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(900px 320px at 80% -20%, rgba(16,185,129,0.32), transparent 60%)," +
            "radial-gradient(700px 320px at -10% 110%, rgba(5,150,105,0.20), transparent 60%)," +
            "rgba(255,255,255,0.025)",
          border: "1px solid rgba(16,185,129,0.22)",
          boxShadow: "0 20px 60px -28px rgba(16,185,129,0.45)",
        }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] mb-3"
              style={{ color: "#6ee7b7" }}>
              <Wallet className="h-3 w-3" />
              Current balance
            </div>
            <div className="flex items-baseline gap-2">
              <span style={{
                fontFamily: "var(--font-instrument-serif), serif",
                fontSize: "clamp(56px, 9vw, 96px)",
                lineHeight: 1,
                letterSpacing: "-0.025em",
                background: "linear-gradient(135deg, #34d399, #10b981)",
                WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {money(balanceCents)}
              </span>
            </div>
            <p className="mt-3 text-sm max-w-md" style={{ color: "rgba(255,255,255,0.65)" }}>
              Your wallet is automatically charged when you claim a lead. Top up to keep claiming.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/account"
                className="inline-flex items-center gap-2 rounded-xl text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 10px 24px -10px rgba(16,185,129,0.7)" }}>
                <Plus className="h-4 w-4" /> Add funds
              </Link>
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl font-semibold px-5 py-2.5 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)" }}>
                Browse leads <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right column: 30-day stats */}
          <div className="grid grid-cols-2 gap-2 shrink-0 self-start lg:self-end">
            <StatTile label="Spent / 30d"  value={money(last30Spent)} accent="#fb7185" />
            <StatTile label="Claimed / 30d" value={String(last30Claims)} accent="#34d399" />
          </div>
        </div>
      </header>

      {/* ───── ACTIVITY ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            {transactions.length} transactions
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-3xl p-10 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(16,185,129,0.22)" }}>
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white mb-3"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No activity yet.</h3>
            <p className="mt-1 text-sm max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Add funds and your transactions will appear here.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl overflow-hidden divide-y divide-white/5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {transactions.map((t) => {
              const tone = KIND_TONE[t.kind];
              const positive = t.amount_cents > 0;
              return (
                <li key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                  <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                    style={{ background: tone.bg, border: `1px solid ${tone.ring}`, color: tone.color }}>
                    {positive ? <ArrowUpRight className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {t.description ?? tone.label}
                    </div>
                    <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {tone.label} · {timeAgo(t.created_at)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums"
                      style={{ color: positive ? "#6ee7b7" : "rgba(255,255,255,0.85)" }}>
                      {positive ? "+" : ""}{money(Math.abs(t.amount_cents))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ───── CLAIMED LEADS ─────────────────────────────────── */}
      {claimed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Your claimed leads
              <span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.45)" }}>
                ({claimed.length})
              </span>
            </h2>
          </div>
          <ul className="rounded-2xl overflow-hidden divide-y divide-white/5"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {claimed.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{l.service_type}</div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                    {[l.city, l.zip].filter(Boolean).join(" · ") || "—"} · Claimed {timeAgo(l.bought_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums" style={{ color: "#a7f3d0" }}>
                    {money(l.price_cents)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl p-3 min-w-[140px]"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}33` }}>
      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-white mt-1 leading-none">{value}</div>
    </div>
  );
}
