import { getProfile, getUserOrRedirect } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PLANS, PLAN_LIMITS } from "@/lib/plans";
import { CheckoutButton } from "./CheckoutButton";
import { ManageBillingButton } from "./ManageBillingButton";

export default async function BillingPage() {
  await getUserOrRedirect();
  const profile = await getProfile();
  const used = profile?.monthly_generations_used ?? 0;
  const limit = PLAN_LIMITS[profile?.plan ?? "free"];

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
      <p className="mt-1 text-zinc-600">
        Current plan: <strong>{profile?.plan ?? "free"}</strong> · {used} / {limit} generations used this month
      </p>

      {profile?.stripe_customer_id && (
        <div className="mt-4">
          <ManageBillingButton />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = profile?.plan === plan.id;
          return (
            <div key={plan.id} className="card flex flex-col">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}<span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <p className="mt-1 text-sm text-zinc-600">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-700">
                {plan.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
              {plan.id === "free" ? (
                <button disabled className="btn-outline mt-6">
                  {isCurrent ? "Current plan" : "Free tier"}
                </button>
              ) : isCurrent ? (
                <button disabled className="btn-outline mt-6">Current plan</button>
              ) : (
                <CheckoutButton plan={plan.id} />
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
