import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  qualifying: "bg-amber-100 text-amber-800",
  booked: "bg-emerald-100 text-emerald-800",
  won: "bg-emerald-200 text-emerald-900",
  lost: "bg-slate-200 text-slate-700",
  spam: "bg-red-100 text-red-800"
};

export default async function LeadsPage() {
  const supabase = createSupabaseServerClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id,phone,name,status,source,last_message_at,created_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lead inbox</h1>
          <p className="text-sm text-slate-600">All callers who landed in the funnel.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No leads yet. They'll show up here as soon as Twilio fires a webhook.
                </td>
              </tr>
            )}
            {(leads ?? []).map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {lead.name || lead.phone}
                  </Link>
                  {lead.name && (
                    <p className="text-xs text-slate-500">{lead.phone}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[lead.status as string] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{lead.source ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {lead.last_message_at
                    ? new Date(lead.last_message_at as string).toLocaleString()
                    : new Date(lead.created_at as string).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
