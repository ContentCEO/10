import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import JobActions from "./JobActions";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = createSupabaseServerClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, profiles:profiles!jobs_customer_id_fkey(full_name, email)")
    .order("scheduled_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Scheduled</th>
              <th>Customer</th>
              <th>Technician</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(jobs ?? []).map((j: any) => (
              <tr key={j.id}>
                <td>{formatDateTime(j.scheduled_at)}</td>
                <td>
                  <div className="font-medium text-slate-900">{j.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-slate-500">{j.profiles?.email}</div>
                </td>
                <td>{j.technician_name || "—"}</td>
                <td><StatusBadge value={j.status} /></td>
                <td><JobActions jobId={j.id} status={j.status} /></td>
              </tr>
            ))}
            {(jobs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No jobs scheduled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
