import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = createSupabaseServerClient();

  const [{ count: customerCount }, { count: activeSubs }, { data: jobs }, { data: openRequests }, { data: payments }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("jobs")
        .select("id, scheduled_at, status, technician_name, customer_id, profiles:profiles!jobs_customer_id_fkey(full_name,email)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("service_requests")
        .select("id, title, priority, status, created_at, profiles:profiles!service_requests_customer_id_fkey(full_name,email)")
        .neq("status", "completed")
        .neq("status", "canceled")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("amount_cents, status, paid_at")
        .eq("status", "succeeded")
        .gte("paid_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    ]);

  const mrr = (payments ?? []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

  const stats = [
    { label: "Customers", value: customerCount ?? 0 },
    { label: "Active subscriptions", value: activeSubs ?? 0 },
    { label: "Revenue (30d)", value: formatCurrency(mrr) },
    { label: "Open requests", value: (openRequests ?? []).length }
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-900">Upcoming jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-brand-700 hover:underline">View all →</Link>
          </header>
          <div className="divide-y divide-slate-100">
            {(jobs ?? []).length === 0 && (
              <p className="px-5 py-6 text-sm text-slate-500">No upcoming jobs scheduled.</p>
            )}
            {(jobs ?? []).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {j.profiles?.full_name || j.profiles?.email || "Customer"}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(j.scheduled_at)} · {j.technician_name || "Unassigned"}</div>
                </div>
                <StatusBadge value={j.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-900">Open service requests</h2>
            <Link href="/admin/requests" className="text-sm text-brand-700 hover:underline">View all →</Link>
          </header>
          <div className="divide-y divide-slate-100">
            {(openRequests ?? []).length === 0 && (
              <p className="px-5 py-6 text-sm text-slate-500">No open requests right now. 🎉</p>
            )}
            {(openRequests ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500">
                    {r.profiles?.full_name || r.profiles?.email} · {formatDateTime(r.created_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={r.priority} />
                  <StatusBadge value={r.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
