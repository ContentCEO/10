import { notFound } from "next/navigation";
import { Check, Shield } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProposalActions } from "./ProposalActions";

export const dynamic = "force-dynamic";

interface LineItem { label: string; qty: number; unit_price_cents: number }
interface Tier { name: string; price_cents: number; summary: string; line_items: LineItem[] }

interface Proposal {
  id: string;
  user_id: string;
  title: string;
  intro: string | null;
  terms: string | null;
  tiers: Tier[];
  status: string;
  selected_tier_idx: number | null;
  share_token: string;
  customer_signature: string | null;
  financing_url: string | null;
  expires_at: string | null;
}

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data } = await admin.from("proposals").select("*").eq("share_token", params.token).single();
  if (!data) notFound();
  const p = data as Proposal;

  // Record first view
  if (p.status === "sent" || p.status === "draft") {
    await admin.from("proposals").update({
      viewed_at: new Date().toISOString(),
      status: p.status === "draft" ? "viewed" : "viewed",
    }).eq("id", p.id);
  }

  const { data: bizProfile } = await admin
    .from("profiles").select("business_name,logo_url,brand_logo_url,phone_public")
    .eq("id", p.user_id).single();
  const biz = bizProfile as { business_name?: string; logo_url?: string; brand_logo_url?: string; phone_public?: string } | null;

  const isSigned = p.status === "signed" || p.status === "paid";
  const isExpired = p.expires_at ? new Date(p.expires_at) < new Date() : false;

  return (
    <main className="min-h-screen bg-mesh-1 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="card p-6 sm:p-8 mb-6">
          {biz?.business_name && (
            <div className="text-sm font-semibold gradient-text mb-2">{biz.business_name}</div>
          )}
          <h1 className="display-h1 text-3xl sm:text-4xl">{p.title}</h1>
          {p.intro && <p className="mt-4 lede">{p.intro}</p>}
          {isExpired && (
            <div className="mt-4 badge bg-rose-100 text-rose-700 ring-rose-200">This proposal expired</div>
          )}
          {isSigned && p.selected_tier_idx != null && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 px-4 py-3 ring-1 ring-inset ring-emerald-200">
              <Check className="h-5 w-5" />
              <div className="text-sm">
                Signed by <strong>{p.customer_signature}</strong> · <strong>{p.tiers[p.selected_tier_idx]?.name}</strong> selected
              </div>
            </div>
          )}
        </header>

        {/* Tiers */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {p.tiers.map((t, i) => {
            const isSelected = p.selected_tier_idx === i;
            const isPopular = i === 1;
            return (
              <div
                key={i}
                className={`card p-6 relative ${isSelected ? "ring-2 ring-emerald-500" : isPopular ? "ring-2 ring-brand-500" : ""}`}
              >
                {isPopular && !isSigned && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-gradient text-white ring-transparent text-[10px] shadow-glow">
                    Most popular
                  </span>
                )}
                {isSelected && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-emerald-500 text-white ring-transparent text-[10px] shadow-glow">
                    Your selection
                  </span>
                )}
                <h2 className="text-xl font-bold tracking-tight">{t.name}</h2>
                <div className="mt-2 text-4xl font-bold gradient-text tabular-nums">
                  ${(t.price_cents / 100).toLocaleString()}
                </div>
                {t.summary && <p className="mt-2 text-sm text-ink-600">{t.summary}</p>}
                <ul className="mt-5 space-y-2 text-sm">
                  {t.line_items?.map((li, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="flex-1">
                        {li.label}
                        {li.qty > 1 && <span className="text-ink-500"> × {li.qty}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {p.financing_url && !isSigned && (
          <div className="card p-5 mb-6">
            <h3 className="font-semibold tracking-tight">Need financing?</h3>
            <p className="mt-1 text-sm text-ink-600">Apply for monthly payment plans — instant decision.</p>
            <a href={p.financing_url} target="_blank" rel="noreferrer" className="btn-secondary mt-3 text-sm">
              Apply now
            </a>
          </div>
        )}

        {p.terms && (
          <details className="card p-5 mb-6">
            <summary className="cursor-pointer font-semibold text-sm">Terms &amp; conditions</summary>
            <p className="mt-3 text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{p.terms}</p>
          </details>
        )}

        {!isSigned && !isExpired && (
          <ProposalActions
            shareToken={p.share_token}
            tiers={p.tiers}
          />
        )}

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500">
          <Shield className="h-3.5 w-3.5" />
          Secure proposal · powered by ContractorFlow
        </footer>
      </div>
    </main>
  );
}
