import { requireOrg } from "@/lib/auth";

export default async function AllLeadsPage() {
  const { org, supabase } = await requireOrg();

  const { data: employees } = await supabase
    .from("ai_employees")
    .select("id, name")
    .eq("org_id", org.id);

  const ids = (employees ?? []).map((e) => e.id);
  const nameById = Object.fromEntries((employees ?? []).map((e) => [e.id, e.name]));

  const { data: leads } =
    ids.length === 0
      ? { data: [] as Array<Record<string, unknown>> }
      : await supabase
          .from("leads")
          .select("*")
          .in("ai_employee_id", ids)
          .order("created_at", { ascending: false })
          .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">All Leads</h1>
        <p className="mt-1 text-sm text-slate-600">
          Captured by your AI employees from chats and forms.
        </p>
      </div>

      <section className="card overflow-hidden">
        {leads && leads.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.map((l: any) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs text-slate-700">
                    {nameById[l.ai_employee_id] || "—"}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">{l.name || "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {l.phone || "—"}
                    <br />
                    {l.email || "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-700">{l.service || "—"}</td>
                  <td className="px-4 py-2 text-xs capitalize text-slate-700">{l.status}</td>
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
