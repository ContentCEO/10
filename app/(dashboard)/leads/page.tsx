import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { StatusBadge } from "@/components/StatusBadge";
import { LEAD_STATUSES, STATUS_LABEL, type Lead, type LeadStatus } from "@/lib/types";

interface SearchParams {
  status?: string;
  q?: string;
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;

  let query = supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const status = searchParams.status as LeadStatus | undefined;
  if (status && LEAD_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }
  const q = searchParams.q?.trim();
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},company.ilike.${like}`,
    );
  }

  const { data, error } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-slate-600 mt-1">{leads.length} shown</p>
        </div>
        <Link href="/leads/upload" className="btn-primary">Upload CSV</Link>
      </div>

      <form className="mt-6 flex gap-2 items-center">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email, company…"
          className="input max-w-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="input max-w-xs">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      {error ? (
        <p className="mt-6 text-rose-600 text-sm">Error: {error.message}</p>
      ) : leads.length === 0 ? (
        <div className="mt-10 card p-10 text-center">
          <p className="text-slate-600">No leads yet.</p>
          <Link href="/leads/upload" className="btn-primary mt-4 inline-flex">Upload your first CSV</Link>
        </div>
      ) : (
        <div className="mt-6 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{lead.email ?? "—"}</div>
                      <div className="text-xs text-slate-500">{lead.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.company ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.source ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/leads/${lead.id}`} className="text-brand-600 font-medium">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
