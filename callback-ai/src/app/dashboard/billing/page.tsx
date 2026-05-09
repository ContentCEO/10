import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams
}: {
  searchParams: { status?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,price_id,stripe_customer_id")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const isActive = sub?.status === "active" || sub?.status === "trialing";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-slate-600">Manage your CallBack AI subscription.</p>
      </div>

      {searchParams.status === "success" && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription started. Welcome aboard!
        </div>
      )}
      {searchParams.status === "cancelled" && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Current plan</p>
        <p className="mt-1 text-xl font-semibold">
          {isActive ? "Pro" : "No active subscription"}
        </p>
        {sub?.current_period_end && (
          <p className="mt-1 text-sm text-slate-500">
            Renews{" "}
            {new Date(sub.current_period_end as string).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {!isActive && env.STRIPE_PRICE_ID && (
            <form action="/api/stripe/checkout" method="post">
              <button className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
                Start subscription
              </button>
            </form>
          )}
          {sub?.stripe_customer_id && (
            <form action="/api/stripe/portal" method="post">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Manage in Stripe
              </button>
            </form>
          )}
          {!env.STRIPE_PRICE_ID && (
            <p className="text-sm text-slate-500">
              Set <code>STRIPE_PRICE_ID</code> in your env to enable checkout.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
