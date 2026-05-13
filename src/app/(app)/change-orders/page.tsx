import { redirect } from "next/navigation";
import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChangeOrderForm } from "./ChangeOrderForm";

export const dynamic = "force-dynamic";

interface CO {
  id: string;
  number: number;
  reason: string;
  scope_change: string;
  price_delta_cents: number;
  timeline_delta_days: number;
  status: string;
  signed_at: string | null;
  created_at: string;
  share_token: string;
}

export default async function ChangeOrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("change_orders")
    .select("id,number,reason,scope_change,price_delta_cents,timeline_delta_days,status,signed_at,created_at,share_token")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as CO[];

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <span className="section-eyebrow"><FileSignature className="h-3.5 w-3.5" /> Sales · Change Orders</span>
            <h1 className="mt-2 display-h2"><span className="gradient-text">Mid-job scope changes</span></h1>
            <p className="mt-2 text-sm text-ink-600 max-w-xl">
              Every scope change deserves a paper trail. Create a change order, document the
              reason and price delta, send it to the customer for signature.
            </p>
          </div>
        </div>
      </header>

      <ChangeOrderForm />

      <section className="card p-5">
        <h2 className="font-semibold tracking-tight mb-3">Recent change orders</h2>
        {rows.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-6">No change orders yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((co) => (
              <li key={co.id} className="py-3 flex items-start gap-3">
                <span className="text-xs font-mono text-ink-400 mt-0.5 shrink-0">#{co.number}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{co.reason}</div>
                  <div className="text-xs text-ink-500 truncate">{co.scope_change}</div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className={co.price_delta_cents >= 0 ? "tabular-nums text-emerald-700 font-semibold" : "tabular-nums text-rose-700 font-semibold"}>
                    {co.price_delta_cents >= 0 ? "+" : ""}${(co.price_delta_cents / 100).toFixed(0)}
                  </div>
                  {co.timeline_delta_days !== 0 && (
                    <div className="text-ink-500">{co.timeline_delta_days >= 0 ? "+" : ""}{co.timeline_delta_days}d</div>
                  )}
                  <div className="mt-1">
                    <span className={
                      co.status === "signed"
                        ? "badge bg-emerald-100 text-emerald-700 ring-emerald-200"
                        : co.status === "sent"
                        ? "badge bg-amber-100 text-amber-700 ring-amber-200"
                        : "badge bg-ink-100 text-ink-600 ring-ink-200"
                    }>
                      {co.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
