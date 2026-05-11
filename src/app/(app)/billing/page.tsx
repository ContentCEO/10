import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { BillingActions } from "./BillingActions";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  trialing:    { label: "Free trial",    tone: "bg-blue-100 text-blue-700" },
  active:      { label: "Active",        tone: "bg-emerald-100 text-emerald-700" },
  past_due:    { label: "Past due",      tone: "bg-amber-100 text-amber-700" },
  canceled:    { label: "Canceled",      tone: "bg-slate-100 text-slate-600" },
  incomplete:  { label: "Incomplete",    tone: "bg-slate-100 text-slate-600" },
};

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  const p = profile as Profile | null;
  const status = p?.subscription_status ?? "trialing";
  const statusInfo = STATUS_COPY[status] ?? STATUS_COPY.trialing;

  const trialEnds = p?.trial_ends_at ? new Date(p.trial_ends_at) : null;
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-slate-500">Manage your ContractorFlow subscription.</p>
      </header>

      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">Status</div>
          <span className={`badge ${statusInfo.tone}`}>{statusInfo.label}</span>
        </div>
        {status === "trialing" && (
          <div className="text-sm text-slate-700">
            {daysLeft != null
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`
              : "Your free trial is active."}
          </div>
        )}
        {status === "active" && (
          <div className="text-sm text-slate-700">Your subscription is active. Thanks for using ContractorFlow.</div>
        )}
        {status === "past_due" && (
          <div className="text-sm text-amber-700">
            Your last payment failed. Update your payment method to keep your account active.
          </div>
        )}

        <BillingActions hasCustomer={Boolean(p?.stripe_customer_id)} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">ContractorFlow Pro</h2>
        <p className="mt-1 text-sm text-slate-600">
          Unlimited leads, jobs, customers, AI follow-ups, and AI proposals.
          14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
