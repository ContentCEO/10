import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { LEAD_STATUSES, STATUS_LABEL } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;

  const { count: total } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id);

  const counts: Record<string, number> = {};
  for (const status of LEAD_STATUSES) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ws.id)
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  const { count: sentMessages } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .eq("state", "sent");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">Overview of your reactivation pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/upload" className="btn-primary">Upload CSV</Link>
          <Link href="/leads" className="btn-secondary">View leads</Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Total leads" value={total ?? 0} />
        {LEAD_STATUSES.map((s) => (
          <Stat key={s} label={STATUS_LABEL[s]} value={counts[s]} />
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-semibold">Messages sent</h3>
          <p className="text-3xl font-bold mt-2">{sentMessages ?? 0}</p>
          <p className="text-sm text-slate-600 mt-1">SMS + email combined.</p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold">Quick start</h3>
          <ol className="mt-2 text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Upload a CSV of old leads</li>
            <li>Open a lead and generate an AI message</li>
            <li>Send via SMS or email and track replies</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
