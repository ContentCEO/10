import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import RequestActions from "./RequestActions";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const supabase = createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("service_requests")
    .select("*, profiles:profiles!service_requests_customer_id_fkey(full_name, email, phone)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Service requests</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Request</th>
              <th>Customer</th>
              <th>Preferred</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(requests ?? []).map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div className="font-medium text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.category || "General"}</div>
                </td>
                <td>
                  <div className="font-medium text-slate-900">{r.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-slate-500">{r.profiles?.email}</div>
                </td>
                <td>
                  {r.preferred_date ? formatDate(r.preferred_date) : "—"}
                  {r.preferred_time_window && (
                    <div className="text-xs text-slate-500">{r.preferred_time_window}</div>
                  )}
                </td>
                <td><StatusBadge value={r.priority} /></td>
                <td><StatusBadge value={r.status} /></td>
                <td className="text-xs text-slate-500">{formatDateTime(r.created_at)}</td>
                <td><RequestActions requestId={r.id} customerId={r.customer_id} status={r.status} /></td>
              </tr>
            ))}
            {(requests ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  No service requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
