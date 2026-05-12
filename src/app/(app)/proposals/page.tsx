import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Proposal {
  id: string;
  title: string;
  status: string;
  selected_tier_idx: number | null;
  tiers: { name: string; price_cents: number }[];
  share_token: string;
  created_at: string;
  signed_at: string | null;
  viewed_at: string | null;
}

const STATUS_TONE: Record<string, string> = {
  draft:    "bg-ink-100 text-ink-700 ring-ink-200",
  sent:     "bg-blue-100 text-blue-700 ring-blue-200",
  viewed:   "bg-amber-100 text-amber-700 ring-amber-200",
  signed:   "bg-emerald-100 text-emerald-700 ring-emerald-200",
  paid:     "bg-emerald-100 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-100 text-rose-700 ring-rose-200",
  expired:  "bg-ink-100 text-ink-500 ring-ink-200",
};

export default async function ProposalsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: proposals } = await supabase
    .from("proposals").select("*").order("created_at", { ascending: false }).limit(50);
  const rows = (proposals ?? []) as Proposal[];

  const counts = {
    draft:    rows.filter((r) => r.status === "draft").length,
    sent:     rows.filter((r) => r.status === "sent" || r.status === "viewed").length,
    signed:   rows.filter((r) => r.status === "signed" || r.status === "paid").length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="section-eyebrow"><FileText className="h-3.5 w-3.5" /> Three-tier proposals</span>
            <h1 className="mt-2 display-h2">Proposals</h1>
            <p className="mt-2 text-sm text-ink-600">
              Good / Better / Best pricing → shareable link → customer picks a tier
              and e-signs. AI drafts the line items.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="badge bg-ink-100 text-ink-700 ring-ink-200">{counts.draft} drafts</span>
              <span className="badge bg-blue-100 text-blue-700 ring-blue-200">{counts.sent} sent</span>
              <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">{counts.signed} signed</span>
            </div>
          </div>
          <Link href="/proposals/new" className="btn-primary shrink-0">
            <Plus className="h-4 w-4" /> New proposal
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm text-ink-600 max-w-md mx-auto">
            No proposals yet. Click <strong>New proposal</strong> to draft your
            first three-tier proposal — describe the scope, AI generates the tiers.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const selectedTier = p.selected_tier_idx != null ? p.tiers[p.selected_tier_idx] : null;
            const range = p.tiers.length > 0
              ? `$${(p.tiers[0].price_cents / 100).toFixed(0)} – $${(p.tiers[p.tiers.length - 1].price_cents / 100).toFixed(0)}`
              : "—";
            return (
              <li key={p.id} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight">{p.title}</h3>
                    <div className="text-xs text-ink-500 mt-1">
                      {p.tiers.length} tiers · {range} · created {formatDate(p.created_at)}
                      {selectedTier && (
                        <> · <strong className="text-emerald-700">{selectedTier.name} signed</strong></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_TONE[p.status] ?? STATUS_TONE.draft} text-[10px]`}>
                      {p.status}
                    </span>
                    <Link href={`/p/${p.share_token}`} target="_blank" className="btn-secondary !py-1.5 text-xs">
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
