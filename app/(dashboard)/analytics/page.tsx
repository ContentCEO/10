import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { LEAD_STATUSES, STATUS_LABEL, type LeadStatus } from "@/lib/types";

export default async function AnalyticsPage() {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;

  const { count: total } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id);

  const statusCounts: Record<LeadStatus, number> = {
    not_contacted: 0,
    sent: 0,
    replied: 0,
    booked: 0,
    dead: 0,
  };
  for (const s of LEAD_STATUSES) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ws.id)
      .eq("status", s);
    statusCounts[s] = count ?? 0;
  }

  const { count: smsSent } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .eq("channel", "sms")
    .eq("state", "sent");

  const { count: emailSent } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .eq("channel", "email")
    .eq("state", "sent");

  const contacted = (total ?? 0) - statusCounts.not_contacted;
  const replyRate = contacted > 0 ? (statusCounts.replied / contacted) * 100 : 0;
  const bookingRate = contacted > 0 ? (statusCounts.booked / contacted) * 100 : 0;
  const max = Math.max(...LEAD_STATUSES.map((s) => statusCounts[s]), 1);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-slate-600 mt-1">Pipeline, send volume, and conversion.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total leads" value={total ?? 0} />
        <Stat label="Contacted" value={contacted} />
        <Stat label="Reply rate" value={`${replyRate.toFixed(1)}%`} />
        <Stat label="Booking rate" value={`${bookingRate.toFixed(1)}%`} />
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-semibold">Pipeline by status</h3>
          <ul className="mt-4 space-y-3">
            {LEAD_STATUSES.map((s) => (
              <li key={s}>
                <div className="flex justify-between text-sm">
                  <span>{STATUS_LABEL[s]}</span>
                  <span className="font-medium">{statusCounts[s]}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${(statusCounts[s] / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold">Messages sent</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="SMS" value={smsSent ?? 0} />
            <Stat label="Email" value={emailSent ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
