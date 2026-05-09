import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ReminderForm from "./ReminderForm";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: reminders }, { data: customers }] = await Promise.all([
    supabase
      .from("maintenance_reminders")
      .select("*, profiles:profiles!maintenance_reminders_customer_id_fkey(full_name, email)")
      .order("send_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, full_name, email").eq("role", "customer").order("full_name")
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Maintenance reminders</h1>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900">Schedule a reminder</h2>
        <p className="text-sm text-slate-500">
          Reminders are dispatched by the cron endpoint <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/api/cron/reminders</code>.
        </p>
        <ReminderForm customers={(customers ?? []).map((c) => ({ id: c.id, label: c.full_name || c.email }))} />
      </div>

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Send at</th>
              <th>Customer</th>
              <th>Title</th>
              <th>Channel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(reminders ?? []).map((r: any) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.send_at)}</td>
                <td>
                  <div className="font-medium text-slate-900">{r.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-slate-500">{r.profiles?.email}</div>
                </td>
                <td>{r.title}</td>
                <td className="capitalize">{r.channel}</td>
                <td><StatusBadge value={r.status} /></td>
              </tr>
            ))}
            {(reminders ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No reminders scheduled.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
