import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PortalOverview() {
  const profile = await requireCustomer();
  const supabase = createSupabaseServerClient();

  const [{ data: subscription }, { data: nextJob }, { data: openRequests }, { data: reminders }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plans(name, price_cents)")
      .eq("customer_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("*")
      .eq("customer_id", profile.id)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("service_requests")
      .select("*")
      .eq("customer_id", profile.id)
      .neq("status", "completed")
      .neq("status", "canceled")
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_reminders")
      .select("*")
      .eq("customer_id", profile.id)
      .gte("send_at", new Date().toISOString())
      .order("send_at", { ascending: true })
      .limit(3)
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile.full_name?.split(" ")[0] || "neighbor"} 👋</h1>
        <p className="mt-1 text-slate-600">Here's what's happening with your home.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-slate-500">Membership</div>
          {subscription ? (
            <>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {(subscription as any).plans?.name || "Active"}
              </div>
              <div className="mt-1 text-xs"><StatusBadge value={subscription.status} /></div>
              {subscription.current_period_end && (
                <div className="mt-2 text-xs text-slate-500">
                  Renews {formatDate(subscription.current_period_end)}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 text-sm text-slate-700">No active membership</div>
              <Link href="/portal/membership" className="btn-primary mt-3 text-xs">Choose a plan</Link>
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="text-sm text-slate-500">Next visit</div>
          {nextJob ? (
            <>
              <div className="mt-1 text-lg font-semibold text-slate-900">{formatDateTime(nextJob.scheduled_at)}</div>
              <div className="text-xs text-slate-500">Technician: {nextJob.technician_name || "TBA"}</div>
              <div className="mt-2 text-xs"><StatusBadge value={nextJob.status} /></div>
            </>
          ) : (
            <div className="mt-1 text-sm text-slate-700">No visit scheduled.</div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-sm text-slate-500">Open requests</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{(openRequests ?? []).length}</div>
          <Link href="/portal/requests" className="mt-2 inline-block text-xs text-brand-700 hover:underline">
            Manage requests →
          </Link>
        </div>
      </div>

      <section className="card">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Upcoming reminders</h2>
        </header>
        <div className="divide-y divide-slate-100">
          {(reminders ?? []).length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-500">No upcoming reminders.</p>
          )}
          {(reminders ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">{r.title}</div>
                <div className="text-xs text-slate-500">{formatDateTime(r.send_at)} · via {r.channel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
