import { requireOrg } from "@/lib/auth";
import { UpgradeButton } from "@/components/UpgradeButton";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { org } = await requireOrg();
  const status = searchParams.status;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          You&apos;re currently on the <strong className="capitalize">{org.plan}</strong> plan.
        </p>
      </div>

      {status === "success" && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your subscription is active. Welcome aboard!
        </div>
      )}
      {status === "canceled" && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was canceled — no charge made.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name="Starter"
          price="$29/mo"
          features={["1 AI employee", "500 chats / month", "Embeddable widget"]}
          cta={
            org.plan === "starter" ? null : <UpgradeButton plan="starter" label="Choose Starter" />
          }
          current={org.plan === "starter"}
        />
        <PlanCard
          name="Pro"
          price="$99/mo"
          features={[
            "Up to 5 AI employees",
            "Unlimited chats",
            "Lead qualification + analytics",
          ]}
          cta={org.plan === "pro" ? null : <UpgradeButton plan="pro" label="Choose Pro" />}
          current={org.plan === "pro"}
          highlighted
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  current,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  cta: React.ReactNode;
  current?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${highlighted ? "border-brand-400 ring-1 ring-brand-200" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
        {current && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Current
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{price}</p>
      <ul className="mt-4 space-y-1 text-sm text-slate-700">
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
      <div className="mt-5">
        {cta ?? (
          <p className="text-xs text-slate-500">You&apos;re on this plan.</p>
        )}
      </div>
    </div>
  );
}
