import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, DollarSign, Mail, MapPin, MessageSquare, Phone, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClaimButton } from "./ClaimButton";
import { getTier } from "@/lib/marketplace-tiers";

export const dynamic = "force-dynamic";

const EMERALD = "#10b981";

interface LeadDetail {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  budget: string | null;
  timeline: string | null;
  notes: string | null;
  ai_summary: string | null;
  ai_score: number | null;
  status: string;
  buyer_id: string | null;
  created_at: string;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,zip,phone,email,budget,timeline,notes,ai_summary,ai_score,status,buyer_id,created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!row) notFound();
  const lead = row as LeadDetail;

  const isMine    = lead.buyer_id === user?.id;
  const available = lead.status === "available" && !lead.buyer_id;
  const hot       = (lead.ai_score ?? 0) >= 80;

  // Pull tier for the counter display.
  const { data: sub } = await admin
    .from("marketplace_subscriptions")
    .select("tier,leads_used_this_period,status")
    .eq("user_id", user!.id)
    .maybeSingle();
  const subRow = sub as { tier: string | null; leads_used_this_period: number; status: string } | null;
  const tier = subRow?.tier ? getTier(subRow.tier) : undefined;
  const activeSub = subRow && ["trialing", "active"].includes(subRow.status);

  const includedRemaining = tier && activeSub
    ? Math.max(0, tier.includedLeads - (subRow!.leads_used_this_period ?? 0))
    : null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:text-white"
        style={{ color: "rgba(255,255,255,0.55)" }}>
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <header className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hot ? "rgba(245, 158, 11, 0.32)" : "rgba(255,255,255,0.08)"}` }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color: hot ? "#fcd34d" : "#6ee7b7" }}>
              {hot ? "🔥 Hot lead" : "Available"} · {lead.service_type ?? "Project"}
            </div>
            <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.02em" }} className="mt-2">
              {lead.name ?? "—"}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              <MapPin className="h-3.5 w-3.5" />
              {[lead.city, lead.zip].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          {lead.ai_score != null && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>AI score</div>
              <div className="text-3xl font-semibold tabular-nums" style={{ color: hot ? "#fcd34d" : EMERALD }}>
                {lead.ai_score}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contact details — only revealed after claim */}
      <section className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[10px] uppercase tracking-wider font-mono mb-4" style={{ color: "rgba(255,255,255,0.50)" }}>
          Contact
        </div>
        {isMine ? (
          <div className="space-y-3">
            {lead.phone && <ContactRow icon={Phone} label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />}
            {lead.email && <ContactRow icon={Mail}  label="Email" value={lead.email} href={`mailto:${lead.email}`} />}
            {lead.name  && <ContactRow icon={User}  label="Name"  value={lead.name} />}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            🔒 Contact info revealed after claim.
          </div>
        )}
      </section>

      {/* Project details */}
      <section className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[10px] uppercase tracking-wider font-mono mb-4" style={{ color: "rgba(255,255,255,0.50)" }}>
          Project
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {lead.budget   && <DetailRow icon={DollarSign} label="Budget"   value={lead.budget} />}
          {lead.timeline && <DetailRow icon={Calendar}   label="Timeline" value={lead.timeline} />}
          <DetailRow icon={Calendar} label="Posted" value={new Date(lead.created_at).toLocaleString()} />
        </div>
        {(lead.notes || lead.ai_summary) && (
          <div className="mt-5 pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] uppercase tracking-wider font-mono mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>
              {lead.ai_summary ? "AI summary" : "Notes"}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
              {lead.ai_summary || lead.notes}
            </p>
          </div>
        )}
      </section>

      {/* Claim CTA */}
      {available && !isMine && (
        <section className="rounded-2xl p-6"
          style={{ background: `${EMERALD}0d`, border: `1px solid ${EMERALD}40` }}>
          {!activeSub ? (
            <div className="space-y-3">
              <div className="font-semibold">Subscribe to claim leads</div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                You need an active Marketplace subscription to claim leads. 7-day free trial — cancel anytime.
              </p>
              <Link href="/account"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)`, color: "#fff" }}>
                Pick a plan
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="font-semibold">Ready to claim?</div>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {includedRemaining !== null && includedRemaining > 0
                    ? `Free claim · ${includedRemaining} of ${tier?.includedLeads} included leads remaining this period.`
                    : tier
                      ? `Overage: $${(tier.overagePerLeadCents / 100).toFixed(0)} added to your next invoice.`
                      : "Confirm to claim."}
                </p>
              </div>
              <ClaimButton leadId={lead.id} />
            </div>
          )}
        </section>
      )}

      {isMine && (
        <section className="rounded-2xl p-6"
          style={{ background: `${EMERALD}14`, border: `1px solid ${EMERALD}40` }}>
          <div className="font-semibold">You claimed this lead</div>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
            Contact the homeowner directly using the info above. First to call wins.
          </p>
        </section>
      )}
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href }: {
  icon: typeof Phone; label: string; value: string; href?: string;
}) {
  const body = (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 shrink-0" style={{ color: EMERALD }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
  if (href) {
    return <a href={href} className="block rounded-lg hover:bg-white/5 px-2 transition-colors">{body}</a>;
  }
  return body;
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.45)" }} />
      <div>
        <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
