import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";

export default async function EmployeeLeadsPage({
  params,
}: {
  params: { id: string };
}) {
  const { org, supabase } = await requireOrg();
  const { data: emp } = await supabase
    .from("ai_employees")
    .select("id, name")
    .eq("id", params.id)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!emp) notFound();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("ai_employee_id", emp.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/employees/${emp.id}`} className="text-xs text-slate-500 hover:text-slate-700">
          ← {emp.name}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
      </div>

      <section className="card overflow-hidden">
        {leads && leads.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{l.name || "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {l.phone || "—"}
                    <br />
                    {l.email || "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-700">{l.service || "—"}</td>
                  <td className="px-4 py-2 text-xs capitalize text-slate-700">{l.status}</td>
                  <td className="px-4 py-2 text-xs text-slate-700">
                    {l.qualification?.score ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">No leads yet.</div>
        )}
      </section>
    </div>
  );
}
