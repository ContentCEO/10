import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createSupabaseServerClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("*, subscriptions(status, plans(name))")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c: any) => {
              const sub = c.subscriptions?.[0];
              return (
                <tr key={c.id}>
                  <td className="font-medium text-slate-900">{c.full_name || "—"}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{sub?.plans?.name || "—"}</td>
                  <td>{sub ? <StatusBadge value={sub.status} /> : <span className="text-xs text-slate-400">No subscription</span>}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              );
            })}
            {(customers ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
