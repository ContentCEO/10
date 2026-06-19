import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Shield, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerifiedSeal, type SealTier } from "@/components/VerifiedSeal";
import { VerificationForm } from "./VerificationForm";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/verification");

  const admin = createAdminClient();
  const [{ data: ver }, { data: profile }] = await Promise.all([
    admin.from("verifications").select("*").eq("user_id", user.id).maybeSingle(),
    admin.from("profiles").select("seal_tier, verified_review_count, median_response_mins").eq("id", user.id).maybeSingle(),
  ]);

  type Ver = {
    status: "unsubmitted" | "pending" | "approved" | "rejected" | "expired";
    hic_number: string | null;
    csl_number: string | null;
    insurance_carrier: string | null;
    insurance_policy: string | null;
    insurance_expiry: string | null;
    reject_reason: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
  };
  const verification = (ver as Ver | null) ?? { status: "unsubmitted" } as Ver;
  const tier = ((profile as { seal_tier?: SealTier } | null)?.seal_tier ?? "none") as SealTier;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="leading-none"
          style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: "clamp(28px, 4vw, 44px)",
            letterSpacing: "-0.025em",
            color: "var(--text)",
          }}>
          Verification &amp; the <em style={{ fontStyle: "italic", color: "var(--emerald-bright)" }}>seal</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--text-muted)" }}>
          The Verified Seal is what every homeowner sees first on your profile. It&apos;s tiered and earned — license &amp; insurance get you Verified, real reviews get you Verified Pro, and a top-decile track record gets you Top Pro.
        </p>
      </header>

      {/* Current seal + status panel */}
      <div className="grid md:grid-cols-[1fr_1fr] gap-4">
        <div className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-wider font-mono mb-3" style={{ color: "var(--text-faint)" }}>
            Your seal
          </div>
          {tier === "none" ? (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full grid place-items-center"
                style={{ background: "var(--surface-raised)", border: "1px dashed var(--border)", color: "var(--text-faint)" }}>
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold" style={{ color: "var(--text)" }}>Not yet verified</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Submit your docs to start receiving exclusive leads.
                </div>
              </div>
            </div>
          ) : (
            <VerifiedSeal tier={tier} size="lg" evidence={{
              hicNumber: verification.hic_number,
              insuranceOnFile: !!verification.insurance_carrier,
              verifiedReviewCount: (profile as { verified_review_count?: number } | null)?.verified_review_count ?? 0,
              medianResponseMins: (profile as { median_response_mins?: number } | null)?.median_response_mins ?? null,
            }} />
          )}
        </div>

        <StatusCard status={verification.status} rejectReason={verification.reject_reason}
                    submittedAt={verification.submitted_at} reviewedAt={verification.reviewed_at} />
      </div>

      {/* Submission form (hidden when pending or approved-current) */}
      {(verification.status === "unsubmitted" || verification.status === "rejected" || verification.status === "expired") && (
        <VerificationForm initial={{
          hic_number: verification.hic_number ?? "",
          csl_number: verification.csl_number ?? "",
          insurance_carrier: verification.insurance_carrier ?? "",
          insurance_policy: verification.insurance_policy ?? "",
          insurance_expiry: verification.insurance_expiry ?? "",
        }} />
      )}

      {/* Tier ladder */}
      <div className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[10px] uppercase tracking-wider font-mono mb-4" style={{ color: "var(--text-faint)" }}>
          How tiers work
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <TierCard tier="verified" requirement="License + insurance confirmed by admin" />
          <TierCard tier="verified_pro" requirement="Verified + ≥5 job-verified reviews avg ≥4.5★ + median response <4 hrs" />
          <TierCard tier="top_pro" requirement="Verified Pro + top-decile win rate + a review in the last 90 days" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ status, rejectReason, submittedAt, reviewedAt }: {
  status: string; rejectReason: string | null; submittedAt: string | null; reviewedAt: string | null;
}) {
  let icon = Clock;
  let title = "";
  let body = "";
  let accent = "var(--text-muted)";
  if (status === "unsubmitted") {
    icon = AlertCircle; title = "Action needed"; accent = "var(--gold)";
    body = "Submit your MA HIC #, insurance carrier + expiry below. Approval is typically same-day.";
  } else if (status === "pending") {
    icon = Clock; title = "Under review"; accent = "var(--emerald-bright)";
    body = `Submitted ${submittedAt ? new Date(submittedAt).toLocaleDateString() : "recently"}. We verify against MA OCABR and check the COI.`;
  } else if (status === "approved") {
    icon = CheckCircle2; title = "Approved"; accent = "var(--emerald)";
    body = `Reviewed ${reviewedAt ? new Date(reviewedAt).toLocaleDateString() : "recently"}. Routing is unlocked.`;
  } else if (status === "rejected") {
    icon = X; title = "Rejected — re-submit"; accent = "var(--danger)";
    body = rejectReason ?? "Resubmit with corrected details below.";
  } else if (status === "expired") {
    icon = AlertCircle; title = "Insurance expired"; accent = "var(--danger)";
    body = "Routing is paused until you re-submit with a current COI.";
  }
  const Icon = icon;

  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono mb-3" style={{ color: "var(--text-faint)" }}>
        Status
      </div>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>{title}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function TierCard({ tier, requirement }: { tier: SealTier; requirement: string }) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      <VerifiedSeal tier={tier} size="md" />
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>{requirement}</p>
    </div>
  );
}
