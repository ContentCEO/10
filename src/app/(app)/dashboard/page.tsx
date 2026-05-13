import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Bot, CalendarClock, ChevronDown, CircleDollarSign,
  Hammer, MessageSquare, Phone, Plus, Receipt, Search, ShoppingCart,
  Sparkles, Star, TrendingUp, Users, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { ActivityStrip } from "./ActivityStrip";
import { PipelineBoard } from "./PipelineBoard";
import { StuckLeadAlert } from "./StuckLeadAlert";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { WeatherWidget } from "@/components/WeatherWidget";
import { SourceRoi } from "@/components/SourceRoi";
import { SourceChannelRoi } from "@/components/SourceChannelRoi";
import { YearOverYear } from "@/components/YearOverYear";
import { ProfitInsights } from "@/components/ProfitInsights";
import { WeeklyDigest } from "@/components/WeeklyDigest";
import { ARAging } from "@/components/ARAging";
import type { FollowUp, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MarketplaceFlagged {
  id: string;
  service_type: string | null;
  city: string | null;
  ai_score: number | null;
  price_cents: number;
  source_channel: string;
  notes: string | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { stay?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (isOwnerEmail(user.email) && searchParams?.stay !== "1") {
    redirect("/owner/control");
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [
    { count: leadCount },
    { count: activeJobCount },
    { data: completedJobs },
    { data: todayCompletedJobs },
    { count: leadsLast24h },
    { data: dueFollowUps },
    { data: recentLeads },
    { data: profile },
    { data: pipelineLeads },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"]),
    supabase.from("jobs").select("price").eq("status", "completed"),
    supabase.from("jobs").select("price").eq("status", "completed")
      .gte("updated_at", startOfDay).lt("updated_at", endOfDay),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("follow_ups").select("*").is("completed_at", null)
      .gte("due_at", startOfDay).lt("due_at", endOfDay).order("due_at"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("business_name,credit_cents,preferences").eq("id", user.id).single(),
    supabase.from("leads").select("id,name,status,service_type,price")
      .order("updated_at", { ascending: false }).limit(40),
  ]);

  // Pull the highest-scoring available marketplace lead as "next best action".
  // Uses admin client because user shouldn't see all marketplace leads via RLS;
  // but the suggestion is fine (server-rendered, just shows the headline).
  const admin = createAdminClient();
  const { data: hot } = await admin
    .from("marketplace_leads")
    .select("id,service_type,city,ai_score,price_cents,source_channel,notes")
    .eq("status", "available")
    .gte("ai_score", 70)
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextBest = hot as MarketplaceFlagged | null;

  const revenue = (completedJobs ?? []).reduce(
    (sum, j: { price: number | null }) => sum + (j.price ?? 0), 0);
  const earnedToday = (todayCompletedJobs ?? []).reduce(
    (sum, j: { price: number | null }) => sum + (j.price ?? 0), 0);

  // Plan 1 / E-16 — Sales pipeline forecasting (weighted by stage probability).
  // Pipeline rows already fetched above. Apply stage weights → expected $.
  const STAGE_PROB: Record<string, number> = {
    new: 0.10, contacted: 0.25, estimate: 0.40, estimate_sent: 0.40, won: 1.00, lost: 0,
  };
  const forecast = (pipelineLeads ?? [])
    .filter((l: { status: string; price: number | null }) => l.status !== "won" && l.status !== "lost" && l.price)
    .reduce((sum: number, l: { status: string; price: number | null }) =>
      sum + (l.price ?? 0) * (STAGE_PROB[l.status ?? "new"] ?? 0.10), 0);

  // Plan 1 / A-5 — Daily morning brief (data-driven, no AI cost).
  const newLeads24h = leadsLast24h ?? 0;
  const dueCount = (dueFollowUps as FollowUp[] | null)?.length ?? 0;
  const briefParts: string[] = [];
  if (newLeads24h > 0) briefParts.push(`${newLeads24h} new lead${newLeads24h === 1 ? "" : "s"} since yesterday`);
  if (dueCount > 0)    briefParts.push(`${dueCount} follow-up${dueCount === 1 ? "" : "s"} due today`);
  if (earnedToday > 0) briefParts.push(`$${earnedToday.toLocaleString()} invoiced today`);
  const brief = briefParts.length > 0
    ? `Today: ${briefParts.join(" · ")}.`
    : "All quiet so far today — good time to claim some marketplace leads.";

  const p = profile as { business_name: string | null; credit_cents: number; preferences: { density?: string } | null } | null;
  const greeting = p?.business_name ? `Hey ${p.business_name}` : "Welcome back";
  const wallet = (((p?.credit_cents ?? 0) / 100)).toFixed(2);
  const lowWallet = (p?.credit_cents ?? 0) < 5000;

  const followUps = (dueFollowUps as FollowUp[] | null) ?? [];
  const leads = (recentLeads as Lead[] | null) ?? [];
  const pipeline = (pipelineLeads ?? []) as Array<{ id: string; name: string; status: string; service_type: string | null; price: number | null }>;

  // "Today's mission" — concrete 1-2-3 list
  const mission: Array<{ kind: "followup" | "lead"; title: string; href: string; action: string }> = [];
  for (const f of followUps.slice(0, 2)) {
    mission.push({ kind: "followup", title: f.title, href: f.lead_id ? `/leads/${f.lead_id}` : "/calendar", action: "Open" });
  }
  for (const l of leads.filter((x) => (x.status ?? "new") === "new").slice(0, 3 - mission.length)) {
    mission.push({ kind: "lead", title: `Reach out to ${l.name}${l.service_type ? ` · ${l.service_type}` : ""}`, href: `/leads/${l.id}`, action: "Call" });
  }

  return (
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -my-6 min-h-screen text-white px-4 sm:px-6 lg:px-8 py-8 pb-24"
         style={{
           background:
             "radial-gradient(900px 600px at 0% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(700px 500px at 100% 40%, rgba(6,182,212,0.10), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
         }}>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── Hero greeting ───────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-7">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute -left-20 -bottom-24 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">{greeting}</span>
              </h1>
              <p className="mt-2 text-sm text-white/60 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5" /> Wallet
                <span className="text-white font-semibold">${wallet}</span>
                {lowWallet && <Link href="/marketplace" className="ml-1 text-brand-300 font-medium hover:underline">top up →</Link>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/leads/new" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
                <Plus className="h-4 w-4" /> New lead
              </Link>
              <Link href="/marketplace" className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow">
                <ShoppingCart className="h-4 w-4" /> Marketplace
              </Link>
            </div>
          </div>
        </header>

        {/* ── AI morning brief (data-driven) ──────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-500/10 via-fuchsia-500/5 to-cyan-500/10 ring-1 ring-brand-400/30 px-5 py-3 text-sm text-white/90 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-brand-300 shrink-0" />
          <span>{brief}</span>
        </div>

        {/* ── Stuck-lead alert (only renders if stale leads exist) ── */}
        <StuckLeadAlert />

        {/* ── Recently viewed (client) ────────────────────────────── */}
        <RecentlyViewed />

        {/* ── Global search bar ───────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search leads, jobs, customers… (Cmd+K)"
            className="w-full bg-white/5 ring-1 ring-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
          />
        </div>

        {/* ── Today's mission ─────────────────────────────────────── */}
        <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Today&apos;s mission
            </div>
            <span className="text-xs text-white/40">{mission.length} item{mission.length === 1 ? "" : "s"}</span>
          </div>
          {mission.length === 0 ? (
            <div className="text-sm text-white/60 text-center py-6">
              No critical actions today. Maybe browse <Link href="/marketplace" className="text-brand-300 hover:underline">the marketplace</Link>.
            </div>
          ) : (
            <ul className="space-y-2">
              {mission.map((m, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3 hover:bg-white/[0.07] transition">
                  <div className="h-7 w-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="text-xs text-white/50">{m.kind === "followup" ? "Follow-up due today" : "New lead — needs first touch"}</div>
                  </div>
                  <Link href={m.href} className="btn bg-white text-ink-900 hover:bg-white/90 text-xs px-3 py-1.5 shrink-0">
                    {m.kind === "followup" ? <CalendarClock className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                    {m.action}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Next best action (AI suggestion) ────────────────────── */}
        {nextBest && (
          <section className="relative overflow-hidden rounded-2xl ring-1 ring-amber-500/30 p-6"
                   style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(217,70,239,0.06) 100%)" }}>
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 shadow-glow flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-white fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 mb-1">
                  AI suggestion · your best lead right now
                </div>
                <h3 className="text-lg font-bold">
                  {nextBest.service_type ?? "Marketplace lead"} · {nextBest.city ?? "—"} · score {nextBest.ai_score}
                </h3>
                <p className="mt-1 text-sm text-white/70 line-clamp-2">{nextBest.notes?.slice(0, 200) ?? ""}</p>
              </div>
              <Link href={`/marketplace?lead=${nextBest.id}`} className="btn bg-white text-ink-900 hover:bg-white/90 shrink-0">
                Open · ${(nextBest.price_cents / 100).toFixed(0)} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* ── Pipeline Kanban ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Pipeline · drag to reclassify
            </div>
            <Link href="/leads" className="text-xs text-brand-300 hover:underline">All leads →</Link>
          </div>
          <PipelineBoard initial={pipeline} />
        </section>

        {/* ── KPI tiles ───────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Total leads",     value: String(leadCount ?? 0),         tone: "from-indigo-500 to-violet-500",   icon: Sparkles },
            { label: "Pipeline · est",  value: `$${Math.round(forecast).toLocaleString()}`, tone: "from-fuchsia-500 to-pink-500", icon: TrendingUp },
            { label: "Active jobs",     value: String(activeJobCount ?? 0),    tone: "from-violet-500 to-fuchsia-500",  icon: Hammer },
            { label: "Earned today",    value: `$${earnedToday.toLocaleString()}`, tone: "from-cyan-500 to-blue-500", icon: CircleDollarSign },
            { label: "Revenue · all",   value: `$${revenue.toLocaleString()}`, tone: "from-emerald-500 to-teal-500",    icon: CircleDollarSign },
            { label: "Due today",       value: String(followUps.length),       tone: "from-amber-500 to-orange-500",    icon: CalendarClock },
          ].map(({ label, value, tone, icon: Icon }, i) => (
            <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-4 text-white shadow-glow`}>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-90 font-semibold">
                <Icon className="h-3 w-3" /> {label}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums count-up" style={{ animationDelay: `${i * 70}ms` }}>{value}</div>
              <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/15" />
            </div>
          ))}
        </section>

        {/* ── Quick actions ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/auto-bid",  label: "AI auto-bid", icon: Bot,           color: "from-indigo-500 to-violet-500" },
            { href: "/inbox",     label: "SMS inbox",   icon: MessageSquare, color: "from-cyan-500 to-sky-500" },
            { href: "/booking",   label: "Booking",     icon: CalendarClock, color: "from-emerald-500 to-teal-500" },
            { href: "/customers", label: "Customers",   icon: Users,         color: "from-amber-500 to-orange-500" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href} className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-3.5 flex items-center gap-3 hover:bg-white/[0.07] transition">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-glow`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium text-sm flex-1">{label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/30" />
            </Link>
          ))}
        </section>

        {/* ── Two-column: Recent leads + Follow-ups + Activity ────── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Recent leads</h3>
              <Link href="/leads" className="text-xs text-brand-300 hover:underline">View all →</Link>
            </div>
            <ul className="divide-y divide-white/5">
              {leads.length === 0 ? (
                <li className="py-6 text-sm text-white/50 text-center">
                  No leads yet. <Link href="/leads/new" className="text-brand-300">Add one.</Link>
                </li>
              ) : leads.map((l) => (
                <li key={l.id} className="py-2.5">
                  <Link href={`/leads/${l.id}`} className="block">
                    <div className="font-medium text-sm truncate">{l.name}</div>
                    <div className="text-xs text-white/50 truncate">
                      {l.service_type ?? l.email ?? l.phone ?? "—"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Follow-ups today</h3>
              <Link href="/calendar" className="text-xs text-brand-300 hover:underline">Calendar →</Link>
            </div>
            <ul className="divide-y divide-white/5">
              {followUps.length === 0 ? (
                <li className="py-6 text-sm text-white/50 text-center">Nothing due today. Nice.</li>
              ) : followUps.map((f) => (
                <li key={f.id} className="py-2.5">
                  <div className="font-medium text-sm">{f.title}</div>
                  <div className="text-xs text-white/50">
                    {new Date(f.due_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {f.notes ? ` · ${f.notes}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <ActivityStrip />
        </div>

        {/* ── Weather widget (3-day forecast for the contractor's area) ─ */}
        <WeatherWidget />

        {/* ── Collapsible insights (legacy components) ────────────── */}
        <details className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 group [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <CircleDollarSign className="h-3.5 w-3.5" /> Insights · revenue · year-over-year · source ROI
            </div>
            <ChevronDown className="h-4 w-4 text-white/40 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-3 [&_.card]:bg-white/[0.04] [&_.card]:!ring-white/10 [&_.card]:!border-white/10 [&_.card]:text-white">
            <WeeklyDigest />
            <YearOverYear />
            <ARAging />
            <ProfitInsights />
            <SourceChannelRoi />
            <SourceRoi />
          </div>
        </details>
      </div>
    </div>
  );
}
