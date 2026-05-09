import Link from "next/link";
import { requireOrg } from "@/lib/auth";

export default async function AllConversationsPage() {
  const { org, supabase } = await requireOrg();

  const { data: employees } = await supabase
    .from("ai_employees")
    .select("id, name")
    .eq("org_id", org.id);

  const ids = (employees ?? []).map((e) => e.id);
  const nameById = Object.fromEntries((employees ?? []).map((e) => [e.id, e.name]));

  const { data: conversations } =
    ids.length === 0
      ? { data: [] as Array<Record<string, unknown>> }
      : await supabase
          .from("conversations")
          .select("id, ai_employee_id, visitor_token, last_message_at, source_url")
          .in("ai_employee_id", ids)
          .order("last_message_at", { ascending: false })
          .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Conversations</h1>

      <section className="card overflow-hidden">
        {conversations && conversations.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {conversations.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link
                    href={`/conversations/${c.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {nameById[c.ai_employee_id] || "—"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {new Date(c.last_message_at).toLocaleString()} ·{" "}
                    {c.source_url || "—"}
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {String(c.visitor_token).slice(0, 8)}…
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">No conversations yet.</div>
        )}
      </section>
    </div>
  );
}
