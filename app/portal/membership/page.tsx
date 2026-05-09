import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import MembershipPlanCard from "./MembershipPlanCard";
import ManageMembership from "./ManageMembership";

export const dynamic = "force-dynamic";

export default async function MembershipPage({ searchParams }: { searchParams: { success?: string; canceled?: string } }) {
  const profile = await requireCustomer();
  const supabase = createSupabaseServerClient();
  const [{ data: plans }, { data: subscription }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).order("price_cents", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("*, plans(name, price_cents)")
      .eq("customer_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Membership</h1>

      {searchParams.success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
          🎉 Thanks for joining HomeCare Club! Your membership is being activated.
        </div>
      )}
      {searchParams.canceled && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Checkout canceled. You can subscribe any time.
        </div>
      )}

      {subscription ? (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Current plan</div>
              <div className="text-xl font-semibold text-slate-900">
                {(subscription as any).plans?.name || "Member"} —{" "}
                {formatCurrency((subscription as any).plans?.price_cents || 0)}/mo
              </div>
              <div className="mt-1"><StatusBadge value={subscription.status} /></div>
              {subscription.current_period_end && (
                <p className="mt-2 text-sm text-slate-600">
                  {subscription.cancel_at_period_end
                    ? `Cancels on ${formatDate(subscription.current_period_end)}`
                    : `Renews on ${formatDate(subscription.current_period_end)}`}
                </p>
              )}
            </div>
            <ManageMembership cancelAtPeriodEnd={subscription.cancel_at_period_end} />
          </div>
        </section>
      ) : (
        <p className="text-slate-600">Choose a plan to start your maintenance membership:</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((p) => (
          <MembershipPlanCard
            key={p.id}
            plan={p}
            current={subscription?.plan_id === p.id}
          />
        ))}
      </div>
    </div>
  );
}
