"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowRight, Bot, Building2, Check, CheckCircle2,
  Clock, FileText, Hammer, Loader2, Megaphone, Pause, Play, RefreshCw,
  ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Users, Wallet,
  Wrench, Zap, Bell, BarChart3,
} from "lucide-react";

const POLL_MS = 10_000;

type Category = "triage" | "marketing" | "sales" | "operations" | "support" | "reporting";

interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  enabled: boolean;
  cadence_minutes: number;
  last_ran_at: string | null;
  next_due_at: string | null;
  actions_24h: number;
}

interface AgentAction {
  id: string;
  agent_slug: string;
  action_type: string;
  target_table: string | null;
  target_id: string | null;
  summary: string;
  details?: Record<string, unknown>;
  requires_approval: boolean;
  approved: boolean | null;
  applied: boolean;
  created_at: string;
}

interface ControlData {
  ok: boolean;
  generated_at: string;
  rollups: {
    total_accounts: number;
    contractor_accounts: number;
    total_leads: number;
    leads_24h: number;
    jobs_active: number;
    customers_total: number;
  };
  agents: Agent[];
  recent_actions: AgentAction[];
  pending_approval: AgentAction[];
}

const CATEGORY_META: Record<Category, { color: string; icon: typeof Bot; label: string }> = {
  triage:     { color: "from-indigo-500 to-violet-500",   icon: Sparkles,  label: "Triage" },
  marketing:  { color: "from-fuchsia-500 to-pink-500",    icon: Megaphone, label: "Marketing" },
  sales:      { color: "from-emerald-500 to-teal-500",    icon: TrendingUp,label: "Sales" },
  operations: { color: "from-amber-500 to-orange-500",    icon: Wrench,    label: "Operations" },
  support:    { color: "from-cyan-500 to-blue-500",       icon: Bell,      label: "Support" },
  reporting:  { color: "from-violet-500 to-purple-500",   icon: BarChart3, label: "Reporting" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)    return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "now";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "due";
  if (ms < 60_000)    return `in ${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `in ${Math.floor(ms / 60_000)}m`;
  return `in ${Math.floor(ms / 3_600_000)}h`;
}

export function MissionControl({ ownerEmail, ownerName }: { ownerEmail: string; ownerName: string }) {
  const [data, setData] = useState<ControlData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/owner/control", { cache: "no-store" });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const json = (await res.json()) as ControlData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (paused) return;
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData, paused]);

  async function decide(actionId: string, decision: "approve" | "deny") {
    startTransition(async () => {
      try {
        await fetch("/api/owner/control/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action_id: actionId, decision }),
        });
        await fetchData();
      } catch { /* silent */ }
    });
  }

  return (
    <div className="space-y-6 text-white" style={{ colorScheme: "dark" }}>
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ring-1 ring-white/10 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl animate-blob-drift" />
        <div className="absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl animate-blob-drift" style={{ animationDelay: "-7s" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="min-w-0">
            <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Owner Mission Control
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{ownerName}</span>
            </h1>
            <p className="mt-1 text-sm text-white/60 font-mono">
              {ownerEmail} · oversight on every account · polling every {POLL_MS / 1000}s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/owner" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              <Activity className="h-4 w-4" /> Raw overseer
            </Link>
            <button onClick={() => setPaused((p) => !p)} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              {paused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
            </button>
            <button onClick={fetchData} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-950/40 ring-1 ring-rose-500/30 p-4 flex items-start gap-3 text-rose-200 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div><strong>Data fetch failed:</strong> {error}</div>
        </div>
      )}

      {!data ? (
        <div className="card p-12 text-center text-white/60">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-3 text-sm">Booting Mission Control…</p>
        </div>
      ) : (
        <>
          {/* Cross-account rollups */}
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: "Accounts",    value: data.rollups.total_accounts,      icon: Users,    tone: "from-indigo-500 to-violet-500" },
              { label: "Contractors", value: data.rollups.contractor_accounts, icon: Hammer,   tone: "from-violet-500 to-fuchsia-500" },
              { label: "Total leads", value: data.rollups.total_leads,         icon: FileText, tone: "from-emerald-500 to-teal-500" },
              { label: "Leads · 24h", value: data.rollups.leads_24h,           icon: Zap,      tone: "from-amber-500 to-orange-500" },
              { label: "Active jobs", value: data.rollups.jobs_active,         icon: Wrench,   tone: "from-cyan-500 to-blue-500" },
              { label: "Customers",   value: data.rollups.customers_total,     icon: Building2,tone: "from-rose-500 to-fuchsia-500" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-4 text-white shadow-glow`}>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-90 font-semibold">
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
                <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/15" />
              </div>
            ))}
          </section>

          {/* Pending approval queue */}
          {data.pending_approval.length > 0 && (
            <section className="rounded-2xl bg-amber-500/[0.05] ring-2 ring-amber-500/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Pending approval · {data.pending_approval.length}
                </div>
                <span className="text-xs text-white/40 font-mono">Owner approval needed</span>
              </div>
              <ul className="space-y-2">
                {data.pending_approval.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-amber-300">{a.agent_slug}</span>
                        <span className="text-xs text-white/40">·</span>
                        <span className="text-xs text-white/50">{a.action_type}</span>
                        <span className="text-xs text-white/40 ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                      <div className="text-sm text-white/90">{a.summary}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => decide(a.id, "approve")}
                        disabled={pending}
                        className="btn bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 text-xs px-3 py-1.5"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => decide(a.id, "deny")}
                        disabled={pending}
                        className="btn bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/30 text-xs px-3 py-1.5"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Deny
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Agent grid */}
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
                <Bot className="h-3.5 w-3.5" /> Agent roster · {data.agents.length}
              </div>
              <span className="text-xs text-white/40 font-mono">
                Auto-tick every 5 min
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.agents.map((a) => {
                const meta = CATEGORY_META[a.category] ?? CATEGORY_META.operations;
                return (
                  <div key={a.slug} className="rounded-xl bg-white/[0.02] ring-1 ring-white/10 p-4 hover:bg-white/[0.05] transition">
                    <div className="flex items-start gap-3">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white shadow-glow shrink-0`}>
                        <meta.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{a.name}</span>
                          {a.enabled ? (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20">on</span>
                          ) : (
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/50 ring-1 ring-white/15">off</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/55 leading-snug line-clamp-2">{a.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase text-white/40 font-mono">Cadence</div>
                        <div className="font-mono tabular-nums">{a.cadence_minutes}m</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/40 font-mono">Last ran</div>
                        <div className="font-mono">{timeAgo(a.last_ran_at)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/40 font-mono">24h actions</div>
                        <div className="font-mono tabular-nums text-emerald-300">{a.actions_24h}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> next {timeUntil(a.next_due_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent actions feed */}
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Recent agent actions
              </div>
              <Link href="/admin/marketplace" className="text-xs text-brand-300 hover:underline">
                Full marketplace →
              </Link>
            </div>
            {data.recent_actions.length === 0 ? (
              <div className="text-sm text-white/50 text-center py-8">
                No actions yet. Agents will run within 5 min of the next cron tick.
              </div>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[440px] overflow-y-auto scrollbar-thin">
                {data.recent_actions.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3">
                    <span className={
                      a.approved === true || a.applied
                        ? "mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"
                        : a.approved === false
                        ? "mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0"
                        : a.requires_approval
                        ? "mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                        : "mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0"
                    } />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-cyan-300">{a.agent_slug}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/50 font-mono">{a.action_type}</span>
                        <span className="text-white/30 ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                      <div className="text-sm text-white/85 mt-0.5 truncate">{a.summary}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="text-xs text-white/40 font-mono text-center py-3">
            generated {new Date(data.generated_at).toLocaleTimeString()} ·
            {paused ? " paused" : ` polling every ${POLL_MS / 1000}s`} ·
            <Link href="/dashboard" className="ml-1 text-brand-300 hover:underline">contractor view <ArrowRight className="h-3 w-3 inline" /></Link>
          </footer>
        </>
      )}
    </div>
  );
}
