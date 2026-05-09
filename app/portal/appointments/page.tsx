import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const profile = await requireCustomer();
  const supabase = createSupabaseServerClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("customer_id", profile.id)
    .order("scheduled_at", { ascending: false });

  const upcoming = (jobs ?? []).filter((j) => new Date(j.scheduled_at) >= new Date() && j.status !== "canceled");
  const past = (jobs ?? []).filter((j) => !upcoming.includes(j));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h2>
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr><th>When</th><th>Technician</th><th>Status</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {upcoming.map((j) => (
                <tr key={j.id}>
                  <td>{formatDateTime(j.scheduled_at)}</td>
                  <td>{j.technician_name || "TBA"}</td>
                  <td><StatusBadge value={j.status} /></td>
                  <td className="text-xs text-slate-500">{j.notes || "—"}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No upcoming appointments.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr><th>When</th><th>Technician</th><th>Status</th></tr>
            </thead>
            <tbody>
              {past.map((j) => (
                <tr key={j.id}>
                  <td>{formatDateTime(j.scheduled_at)}</td>
                  <td>{j.technician_name || "—"}</td>
                  <td><StatusBadge value={j.status} /></td>
                </tr>
              ))}
              {past.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No past appointments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
