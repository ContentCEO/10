"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3, Bell, Bot, GripVertical, Loader2, Megaphone, Pause, Play,
  Power, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Wrench,
} from "lucide-react";

type Category = "triage" | "marketing" | "sales" | "operations" | "support" | "reporting";

interface Agent {
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

const POLL_MS = 10_000;

export function AgentBoard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [hoverLane, setHoverLane] = useState<"on" | "off" | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchAgents = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/owner/control", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { agents: Agent[] };
        setAgents(json.agents ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    if (paused) return;
    const id = setInterval(fetchAgents, POLL_MS);
    return () => clearInterval(id);
  }, [fetchAgents, paused]);

  async function toggle(slug: string, enabled: boolean) {
    // Optimistic update
    setAgents((prev) => prev.map((a) => a.slug === slug ? { ...a, enabled } : a));
    startTransition(async () => {
      try {
        await fetch(`/api/agents/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
      } finally {
        fetchAgents();
      }
    });
  }

  function onDragStart(e: React.DragEvent, slug: string) {
    setDragSlug(slug);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", slug);
  }

  function onLaneDragOver(e: React.DragEvent, lane: "on" | "off") {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setHoverLane(lane);
  }

  function onLaneDragLeave() {
    setHoverLane(null);
  }

  function onLaneDrop(e: React.DragEvent, lane: "on" | "off") {
    e.preventDefault();
    const slug = e.dataTransfer.getData("text/plain") || dragSlug;
    setDragSlug(null);
    setHoverLane(null);
    if (!slug) return;
    const target = agents.find((a) => a.slug === slug);
    if (!target) return;
    const shouldBe = lane === "on";
    if (target.enabled !== shouldBe) toggle(slug, shouldBe);
  }

  const on = agents.filter((a) => a.enabled);
  const off = agents.filter((a) => !a.enabled);

  return (
    <div className="space-y-6 text-white" style={{ colorScheme: "dark" }}>
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ring-1 ring-white/10 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl animate-blob-drift" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Agent workflow board
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Drag-and-drop agents</span>
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Drag any agent between <strong className="text-white">On</strong> and <strong className="text-white">Off</strong>. Changes apply instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/owner/control" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              <Bot className="h-4 w-4" /> Mission Control
            </Link>
            <button onClick={() => setPaused((p) => !p)} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              {paused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
            </button>
            <button onClick={fetchAgents} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-12 text-center text-white/60">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-3 text-sm">Loading agents…</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* ── ON lane ───────────────────────────────────────────── */}
          <div
            onDragOver={(e) => onLaneDragOver(e, "on")}
            onDragLeave={onLaneDragLeave}
            onDrop={(e) => onLaneDrop(e, "on")}
            className={
              hoverLane === "on"
                ? "rounded-2xl bg-emerald-500/[0.08] ring-2 ring-emerald-400/60 p-5 min-h-[520px] transition"
                : "rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 min-h-[520px] transition"
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-300 flex items-center gap-2">
                <Power className="h-3.5 w-3.5" /> On · running
              </div>
              <span className="text-xs text-white/40 font-mono">{on.length} agents</span>
            </div>
            <div className="space-y-2">
              {on.length === 0 && (
                <div className="text-center text-sm text-white/40 py-12 border-2 border-dashed border-white/10 rounded-xl">
                  Drop agents here to enable them.
                </div>
              )}
              {on.map((a) => <AgentCard key={a.slug} agent={a} onDragStart={onDragStart} pending={pending} />)}
            </div>
          </div>

          {/* ── OFF lane ──────────────────────────────────────────── */}
          <div
            onDragOver={(e) => onLaneDragOver(e, "off")}
            onDragLeave={onLaneDragLeave}
            onDrop={(e) => onLaneDrop(e, "off")}
            className={
              hoverLane === "off"
                ? "rounded-2xl bg-rose-500/[0.08] ring-2 ring-rose-400/60 p-5 min-h-[520px] transition"
                : "rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 min-h-[520px] transition"
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-rose-300 flex items-center gap-2">
                <Power className="h-3.5 w-3.5 rotate-180" /> Off · paused
              </div>
              <span className="text-xs text-white/40 font-mono">{off.length} agents</span>
            </div>
            <div className="space-y-2">
              {off.length === 0 && (
                <div className="text-center text-sm text-white/40 py-12 border-2 border-dashed border-white/10 rounded-xl">
                  Drop agents here to disable them.
                </div>
              )}
              {off.map((a) => <AgentCard key={a.slug} agent={a} onDragStart={onDragStart} pending={pending} />)}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-white/40 text-center">
        Drag the grip handle on the left of any card to move it between lanes. Changes save automatically.
      </p>
    </div>
  );
}

function AgentCard({
  agent, onDragStart, pending,
}: {
  agent: Agent;
  onDragStart: (e: React.DragEvent, slug: string) => void;
  pending: boolean;
}) {
  const meta = CATEGORY_META[agent.category] ?? CATEGORY_META.operations;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, agent.slug)}
      className={
        "group flex items-start gap-3 rounded-xl bg-white/[0.02] ring-1 ring-white/10 p-3 cursor-grab active:cursor-grabbing hover:bg-white/[0.06] hover:ring-white/25 transition select-none" +
        (pending ? " opacity-60" : "")
      }
    >
      <GripVertical className="h-4 w-4 text-white/30 mt-0.5 shrink-0 group-hover:text-white/60 transition" />
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white shadow-glow shrink-0`}>
        <meta.icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{agent.name}</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/60 ring-1 ring-white/15">
            {meta.label}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-white/55 line-clamp-1">{agent.description}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-white/40">
          <span>every {agent.cadence_minutes}m</span>
          <span>·</span>
          <span>last {timeAgo(agent.last_ran_at)}</span>
          <span>·</span>
          <span className="text-emerald-300">{agent.actions_24h} actions/24h</span>
        </div>
      </div>
    </div>
  );
}
