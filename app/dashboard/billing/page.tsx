import { createClient } from "@/lib/supabase/server";
import BillingActions from "./BillingActions";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  const status = sub?.status ?? "inactive";
  const plan = sub?.plan ?? "free";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-slate-600">Subscribe to unlock unlimited generation.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2">
            <span className="badge bg-slate-100 text-slate-700">Free</span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold">$0<span className="text-base text-slate-500">/mo</span></h2>
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            <li>• 10 generations / month</li>
            <li>• Single post types only</li>
            <li>• CSV export</li>
          </ul>
        </div>
        <div className="card border-brand-500">
          <div className="flex items-center gap-2">
            <span className="badge bg-brand-100 text-brand-700">Pro</span>
            {plan === "pro" && status === "active" && (
              <span className="badge bg-emerald-100 text-emerald-700">Current plan</span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-semibold">$29<span className="text-base text-slate-500">/mo</span></h2>
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            <li>• Unlimited generations</li>
            <li>• 30-day one-click calendars</li>
            <li>• Image prompts + hashtag mix</li>
            <li>• Priority support</li>
          </ul>
          <div className="mt-5">
            <BillingActions hasSubscription={status === "active"} />
          </div>
        </div>
      </div>
    </div>
  );
}
