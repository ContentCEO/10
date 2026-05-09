import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadStats(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [missedCalls, repliesSent, repliesReceived, booked] = await Promise.all([
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("was_missed", true)
      .gte("created_at", since),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "outbound")
      .eq("ai_generated", true)
      .gte("created_at", since),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "inbound")
      .gte("created_at", since),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
  ]);

  return {
    missedCalls: missedCalls.count ?? 0,
    repliesSent: repliesSent.count ?? 0,
    repliesReceived: repliesReceived.count ?? 0,
    booked: booked.count ?? 0
  };
}

export default async function OverviewPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <h2 className="mb-2 text-xl font-semibold">Set up your business</h2>
        <p className="mb-5 text-slate-600">
          Add your business profile so CallBack AI knows what to text your callers back
          with.
        </p>
        <Link
          href="/dashboard/business"
          className="inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Set up business
        </Link>
      </div>
    );
  }

  const stats = await loadStats(supabase);
  const replyRate = stats.repliesSent
    ? Math.round((stats.repliesReceived / stats.repliesSent) * 100)
    : 0;

  const { data: recent } = await supabase
    .from("notifications")
    .select("id,kind,title,body,created_at,lead_id")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-slate-600">Last 30 days</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Missed calls" value={stats.missedCalls} />
        <Stat label="AI replies sent" value={stats.repliesSent} />
        <Stat label="Replies received" value={stats.repliesReceived} hint={`${replyRate}% reply rate`} />
        <Stat label="Appointments booked" value={stats.booked} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-medium">Recent activity</h2>
          <Link href="/dashboard/leads" className="text-sm text-brand-700 hover:underline">
            See all leads →
          </Link>
        </div>
        <ul>
          {(recent ?? []).length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-slate-500">
              No activity yet — point a Twilio number at this app to get started.
            </li>
          )}
          {(recent ?? []).map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between border-b border-slate-100 px-5 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
              </div>
              <span className="ml-4 whitespace-nowrap text-xs text-slate-500">
                {new Date(n.created_at as string).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
