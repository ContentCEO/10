import { isStripeConfigured } from "@/lib/env";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">Upgrade for unlimited audits, AI plans, and PDF reports.</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Pro plan</div>
            <div className="text-3xl font-semibold text-slate-900">$29<span className="text-base font-normal text-slate-500">/mo</span></div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>· Unlimited audits</li>
              <li>· Unlimited AI review replies</li>
              <li>· Monthly PDF reports</li>
              <li>· Competitor comparison</li>
            </ul>
          </div>
          <CheckoutButton />
        </div>
        {!isStripeConfigured && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            Stripe isn&apos;t configured. Add <code>STRIPE_SECRET_KEY</code> and <code>NEXT_PUBLIC_STRIPE_PRICE_ID</code> to enable checkout.
          </p>
        )}
      </div>
    </div>
  );
}
