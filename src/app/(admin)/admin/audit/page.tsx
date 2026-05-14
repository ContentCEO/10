import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export default async function AuditLogPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit")
    .select("id,actor_email,action,target,details,ip,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-slate-500">← Overview</Link>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" /> Admin audit log
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Latest 200 admin actions. Logged automatically when staff toggle agents, promote users, refund leads, or perform bulk operations.
        </p>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No audit entries yet. They&apos;ll appear here as admins take action.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs truncate max-w-[160px]">
                    {r.actor_email ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{r.action}</code>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {r.target ? (
                      <span className="flex items-center gap-1 text-slate-600">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        {r.target}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{r.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
