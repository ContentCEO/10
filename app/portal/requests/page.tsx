import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";

export default async function PortalRequests() {
  const profile = await requireCustomer();
  const supabase = createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("service_requests")
    .select("*")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });

  const defaultAddress = [profile.street, profile.city, profile.state, profile.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Service requests</h1>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900">Submit a new request</h2>
        <RequestForm defaultAddress={defaultAddress} />
      </div>

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Request</th>
              <th>Preferred</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {(requests ?? []).map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="font-medium text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.category || "General"}</div>
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
              </tr>
            ))}
            {(requests ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No requests yet — submit one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
