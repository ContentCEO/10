import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { org, supabase } = await requireOrg();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, ai_employee_id, visitor_token, source_url, created_at, last_message_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!conv) notFound();

  // Verify ownership via employee join.
  const { data: emp } = await supabase
    .from("ai_employees")
    .select("id, name")
    .eq("id", conv.ai_employee_id)
    .eq("org_id", org.id)
    .maybeSingle();
  if (!emp) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/employees/${emp.id}/conversations`}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← {emp.name} · Conversations
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Conversation</h1>
        <p className="mt-1 text-xs text-slate-500">
          Started {new Date(conv.created_at).toLocaleString()} · {conv.source_url || "—"}
        </p>
      </div>

      <section className="card p-5">
        <div className="space-y-3">
          {(messages ?? []).map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : m.role === "assistant"
                    ? "flex justify-start"
                    : "flex justify-center"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[70%] rounded-2xl bg-brand-600 px-4 py-2 text-sm text-white"
                    : m.role === "assistant"
                      ? "max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-900"
                      : "max-w-[70%] rounded-md bg-amber-50 px-3 py-1 text-xs text-amber-700"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {(!messages || messages.length === 0) && (
            <p className="text-center text-sm text-slate-500">No messages.</p>
          )}
        </div>
      </section>
    </div>
  );
}
