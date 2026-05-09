import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BillingActions } from "./BillingActions";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id")
    .eq("id", user!.id)
    .maybeSingle();
  const isPro = profile?.plan === "pro";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Billing</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your subscription.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          features={["Up to 3 proposals/month", "PDF export", "Basic AI generation"]}
          current={!isPro}
        />
        <PlanCard
          name="Pro"
          price="$29/mo"
          features={["Unlimited proposals", "Photos & branding", "Priority AI generation", "Stripe billing portal"]}
          current={isPro}
          highlight
        />
      </div>

      <div className="mt-6 card p-6">
        <BillingActions isPro={isPro} hasSubscription={Boolean(profile?.stripe_subscription_id)} />
        <p className="mt-4 text-xs text-gray-500">
          Need help? <Link href="/" className="text-brand-600 hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, features, current, highlight,
}: { name: string; price: string; features: string[]; current: boolean; highlight?: boolean }) {
  return (
    <div className={`card p-6 ${highlight ? "ring-2 ring-brand-500" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        {current && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Current</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-gray-700">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-brand-600" /> {f}</li>
        ))}
      </ul>
    </div>
  );
}
