import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { UpgradeButton } from "./UpgradeButton";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, company")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const plan = profile?.plan ?? "free";

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-ink-400">
          You're on the{" "}
          <span className="font-semibold text-white">
            {plan === "pro" ? "Pro" : "Free"}
          </span>{" "}
          plan.
        </p>

        {searchParams.status === "success" ? (
          <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            Payment successful — your account will upgrade within a few seconds.
          </p>
        ) : null}
        {searchParams.status === "cancelled" ? (
          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Checkout was cancelled. No charge was made.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            features={[
              "5 call analyses / month",
              "Basic dashboard",
              "Objection workbench",
            ]}
            current={plan !== "pro"}
          />
          <PlanCard
            name="Pro"
            price="$49 / month"
            highlight
            features={[
              "Unlimited call analyses",
              "Saved scripts & objection library",
              "Improvement trend chart",
              "Auto-drafted follow-up email & SMS",
              "Priority Claude model",
            ]}
            current={plan === "pro"}
            cta={plan === "pro" ? null : <UpgradeButton />}
          />
        </div>
      </main>
    </>
  );
}

function PlanCard({
  name,
  price,
  features,
  highlight,
  current,
  cta,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  current?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <div
      className={`card flex flex-col ${
        highlight ? "border-brand-500/60 bg-brand-500/5" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{name}</h2>
        {current ? (
          <span className="badge bg-emerald-500/20 text-emerald-200">
            Current
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white">{price}</div>
      <ul className="mt-4 space-y-2 text-sm text-ink-200">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-300" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
