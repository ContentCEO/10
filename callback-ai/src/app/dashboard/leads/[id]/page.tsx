import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import { recordMessage } from "@/lib/leads";

export const dynamic = "force-dynamic";

async function sendManualReply(formData: FormData) {
  "use server";
  const leadId = String(formData.get("lead_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!leadId || !body) return;

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lead } = await supabase
    .from("leads")
    .select("id,phone,business_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return;

  // RLS restricts to owner; this lookup also fails if the business isn't ours.
  const { data: business } = await supabase
    .from("businesses")
    .select("id,owner_id,twilio_number")
    .eq("id", lead.business_id as string)
    .maybeSingle();
  if (!business || business.owner_id !== user.id) return;

  const sent = await sendSms({
    to: lead.phone as string,
    body,
    from: (business.twilio_number as string | null) ?? undefined
  });

  await recordMessage(supabase, {
    businessId: lead.business_id as string,
    leadId: lead.id as string,
    direction: "outbound",
    body,
    twilioSid: sent.sid,
    aiGenerated: false,
    status: "sent"
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export default async function ConversationPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id,direction,body,ai_generated,created_at,status")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: true });

  const { data: calls } = await supabase
    .from("calls")
    .select("id,status,was_missed,duration_sec,created_at")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <div className="mb-4">
          <Link href="/dashboard/leads" className="text-sm text-slate-600 hover:underline">
            ← Back to inbox
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{lead.name || lead.phone}</h1>
          <p className="text-sm text-slate-600">
            {lead.phone} · status <span className="font-medium">{lead.status}</span>
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          {(messages ?? []).length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              No messages yet.
            </p>
          )}
          {(messages ?? []).map((m) => {
            const inbound = m.direction === "inbound";
            return (
              <div
                key={m.id}
                className={`flex ${inbound ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    inbound
                      ? "rounded-bl-sm bg-slate-100 text-slate-900"
                      : "rounded-br-sm bg-brand-600 text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] uppercase tracking-wide ${
                      inbound ? "text-slate-500" : "text-brand-100"
                    }`}
                  >
                    {new Date(m.created_at as string).toLocaleString()}
                    {m.ai_generated ? " · AI" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form
          action={sendManualReply}
          className="mt-4 rounded-xl border border-slate-200 bg-white p-3"
        >
          <input type="hidden" name="lead_id" value={lead.id as string} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Type a reply…"
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <div className="mt-2 flex justify-end">
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Send SMS
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 font-medium">Call history</h3>
          <ul className="space-y-2 text-sm">
            {(calls ?? []).length === 0 && (
              <li className="text-slate-500">No calls recorded.</li>
            )}
            {(calls ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>
                  {c.was_missed ? "Missed" : c.status}
                  {c.duration_sec ? ` · ${c.duration_sec}s` : ""}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(c.created_at as string).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {lead.notes && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h3 className="mb-2 font-medium">Notes</h3>
            <p className="whitespace-pre-wrap text-slate-700">{lead.notes as string}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
