import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link href="/leads/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New lead
        </Link>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Service</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Estimated</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(leads as Lead[] | null)?.length ? (
              (leads as Lead[]).map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-brand-700">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {lead.email ?? lead.phone ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">{lead.service_type ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{formatCurrency(lead.estimated_value)}</td>
                  <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No leads yet. <Link href="/leads/new" className="text-brand-600 font-medium">Create your first one.</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
