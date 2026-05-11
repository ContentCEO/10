import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CircleDollarSign,
  Hammer,
  MessageSquare,
  Plus,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { SourceRoi } from "@/components/SourceRoi";
import { SourceChannelRoi } from "@/components/SourceChannelRoi";
import { YearOverYear } from "@/components/YearOverYear";
import { ProfitInsights } from "@/components/ProfitInsights";
import { WeeklyDigest } from "@/components/WeeklyDigest";
import { ARAging } from "@/components/ARAging";
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
    { data: profile },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"]),
    supabase.from("jobs").select("price").eq("status", "completed"),
    supabase.from("follow_ups").select("*").is("completed_at", null)
      .gte("due_at", startOfDay).lt("due_at", endOfDay).order("due_at"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("business_name,credit_cents").eq("id", user.id).single(),
  ]);

  const revenue = (completedJobs ?? []).reduce(
    (sum, j: { price: number | null }) => sum + (j.price ?? 0),
    0,
  );

  const p = profile as { business_name: string | null; credit_cents: number } | null;
  const greeting = p?.business_name ? `Hey ${p.business_name}` : "Welcome back";

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">{greeting}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {" · "}wallet balance ${(((p?.credit_cents ?? 0) / 100)).toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/leads/new" className="btn-secondary">
              <Plus className="h-4 w-4" /> New lead
            </Link>
            <Link href="/marketplace" className="btn-primary">
              <ShoppingCart className="h-4 w-4" /> Marketplace
            </Link>
          </div>
        </div>
      </header>

      {/* Snapshot — 4 KPI tiles */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Snapshot</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard tone="indigo"  label="Total leads"    value={String(leadCount ?? 0)}        icon={Sparkles} />
          <StatCard tone="violet"  label="Active jobs"    value={String(activeJobCount ?? 0)}   icon={Hammer} />
          <StatCard tone="emerald" label="Revenue"        value={formatCurrency(revenue)}       icon={CircleDollarSign} hint="From completed jobs" />
          <StatCard tone="amber"   label="Due today"      value={String(dueFollowUps?.length ?? 0)} icon={CalendarClock} />
        </div>
      </section>

      {/* Quick actions strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction href="/auto-bid"  label="AI auto-bid"  icon={Bot}           color="from-indigo-500 to-violet-500" />
        <QuickAction href="/inbox"     label="SMS inbox"    icon={MessageSquare} color="from-cyan-500 to-sky-500" />
        <QuickAction href="/booking"   label="Booking"      icon={CalendarClock} color="from-emerald-500 to-teal-500" />
        <QuickAction href="/customers" label="Customers"    icon={Users}         color="from-amber-500 to-orange-500" />
      </section>

      {/* AI digest + YoY = top of intelligence layer */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Intelligence</h2>
        <div className="grid gap-4">
          <WeeklyDigest />
          <YearOverYear />
        </div>
      </section>

      {/* Revenue layer */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Revenue</h2>
        <div className="grid gap-4">
          <ARAging />
          <ProfitInsights />
        </div>
      </section>

      {/* Source layer */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Lead sources</h2>
        <div className="grid gap-4">
          <SourceChannelRoi />
          <SourceRoi />
        </div>
      </section>

      {/* Today's queue */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Today's queue</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent leads</h3>
              <Link href="/leads" className="text-sm text-brand-600 inline-flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
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
              <h3 className="font-semibold">Follow-ups due today</h3>
              <Link href="/calendar" className="text-sm text-brand-600 inline-flex items-center gap-1">
                Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {(dueFollowUps as FollowUp[] | null)?.length ? (
                (dueFollowUps as FollowUp[]).map((f) => (
                  <li key={f.id} className="py-3">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(f.due_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href, label, icon: Icon, color,
}: {
  href: string;
  label: string;
  icon: typeof Bot;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="card card-hover p-4 flex items-center gap-3 group"
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-glow`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-medium text-sm flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-600 transition" />
    </Link>
  );
}
