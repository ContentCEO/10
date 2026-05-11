import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  Hammer,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { SourceRoi } from "@/components/SourceRoi";
import { ProfitInsights } from "@/components/ProfitInsights";
import { WeeklyDigest } from "@/components/WeeklyDigest";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FollowUp, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [
    { count: leadCount },
    { count: activeJobCount },
    { data: completedJobs },
    { data: dueFollowUps },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"]),
    supabase.from("jobs").select("price").eq("status", "completed"),
    supabase.from("follow_ups").select("*").is("completed_at", null)
      .gte("due_at", startOfDay).lt("due_at", endOfDay).order("due_at"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const revenue = (completedJobs ?? []).reduce(
    (sum, j: { price: number | null }) => sum + (j.price ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">Today, {formatDate(today.toISOString())}</p>
        </div>
        <Link href="/leads/new" className="btn-primary">
          <Sparkles className="h-4 w-4" /> New lead
        </Link>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard tone="indigo"  label="Total leads" value={String(leadCount ?? 0)} icon={Sparkles} />
        <StatCard tone="violet"  label="Active jobs" value={String(activeJobCount ?? 0)} icon={Hammer} />
        <StatCard tone="emerald" label="Revenue" value={formatCurrency(revenue)} icon={CircleDollarSign}
          hint="From completed jobs" />
        <StatCard tone="amber"   label="Follow-ups due today" value={String(dueFollowUps?.length ?? 0)}
          icon={CalendarClock} />
      </section>

      <WeeklyDigest />

      <ProfitInsights />

      <SourceRoi />

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent leads</h2>
            <Link href="/leads" className="text-sm text-brand-600">View all →</Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {(recentLeads as Lead[] | null)?.length ? (
              (recentLeads as Lead[]).map((lead) => (
                <li key={lead.id} className="py-3 flex items-center justify-between">
                  <Link href={`/leads/${lead.id}`} className="min-w-0">
                    <div className="font-medium truncate">{lead.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {lead.service_type ?? lead.email ?? lead.phone ?? "—"}
                    </div>
                  </Link>
                  <LeadStatusBadge status={lead.status} />
                </li>
              ))
            ) : (
              <li className="py-6 text-sm text-slate-500 text-center">
                No leads yet. <Link href="/leads/new" className="text-brand-600">Add your first lead.</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Follow-ups due today</h2>
            <Link href="/calendar" className="text-sm text-brand-600">Calendar →</Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {(dueFollowUps as FollowUp[] | null)?.length ? (
              (dueFollowUps as FollowUp[]).map((f) => (
                <li key={f.id} className="py-3">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(f.due_at).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit",
                    })}
                    {f.notes ? ` · ${f.notes}` : ""}
                  </div>
                </li>
              ))
            ) : (
              <li className="py-6 text-sm text-slate-500 text-center">
                Nothing due today. Nice.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
