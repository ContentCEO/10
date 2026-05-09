import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";

export default async function EmployeeConversationsPage({
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

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, visitor_token, created_at, last_message_at, source_url")
    .eq("ai_employee_id", emp.id)
    .order("last_message_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/employees/${emp.id}`} className="text-xs text-slate-500 hover:text-slate-700">
          ← {emp.name}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Conversations</h1>
      </div>

      <section className="card overflow-hidden">
        {conversations && conversations.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Last message</th>
                <th className="px-4 py-2">Visitor</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {conversations.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">{fmt(c.created_at)}</td>
                  <td className="px-4 py-2">{fmt(c.last_message_at)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {c.visitor_token.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{c.source_url || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/conversations/${c.id}`}
                      className="text-brand-700 hover:text-brand-800"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">No conversations yet.</div>
        )}
      </section>
    </div>
  );
}

function fmt(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
