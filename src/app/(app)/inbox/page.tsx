import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Msg {
  id: string;
  from_phone: string;
  to_phone: string | null;
  body: string;
  matched_lead_id: string | null;
  created_at: string;
}

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("inbound_messages").select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(100);
  const messages = (data ?? []) as Msg[];

  // Group by from_phone for thread-style display.
  const threads = new Map<string, Msg[]>();
  for (const m of messages) {
    if (!threads.has(m.from_phone)) threads.set(m.from_phone, []);
    threads.get(m.from_phone)!.push(m);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-600" /> SMS inbox
        </h1>
        <p className="text-sm text-slate-500">
          Inbound text messages to your Twilio number. Configure your number's
          webhook to <code>/api/sms/inbound</code> and set your Twilio number on
          your <Link href="/profile" className="text-brand-600">profile</Link>.
        </p>
      </header>

      {threads.size === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No inbound messages yet. The webhook is live at
          <code className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded">/api/sms/inbound</code>.
        </div>
      ) : (
        <ul className="space-y-3">
          {Array.from(threads.entries()).map(([phone, msgs]) => (
            <li key={phone} className="card p-4">
              <div className="flex items-center justify-between">
                <strong className="font-mono">{phone}</strong>
                {msgs[0]?.matched_lead_id && (
                  <Link href={`/leads/${msgs[0].matched_lead_id}`} className="text-xs text-brand-600">
                    Open lead →
                  </Link>
                )}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {msgs.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <p>{m.body}</p>
                    <span className="text-xs text-slate-400">{formatDate(m.created_at)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
