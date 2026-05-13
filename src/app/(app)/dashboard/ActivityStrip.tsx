"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, Sparkles } from "lucide-react";

interface AgentAction {
  id: string;
  agent_slug: string;
  action_type: string;
  summary: string;
  created_at: string;
}

interface Feed {
  ok: boolean;
  recent_actions: AgentAction[];
}

const POLL_MS = 15_000;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}

export function ActivityStrip() {
  const [items, setItems] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/control", { cache: "no-store" });
      if (!res.ok) { setLoading(false); return; }
      const data = (await res.json()) as Feed;
      setItems((data.recent_actions ?? []).slice(0, 10));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  if (loading && items.length === 0) {
    return (
      <div className="text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-ink-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <span className="text-[10px] text-ink-400 font-mono inline-flex items-center gap-1">
          <Activity className="h-3 w-3" /> refresh {POLL_MS / 1000}s
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-ink-400 text-center py-6 italic">
          Agents will run within 5 min and their actions stream here.
        </div>
      ) : (
        <ul className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono text-brand-700">{a.agent_slug}</div>
                <div className="text-ink-800 leading-snug truncate">{a.summary}</div>
              </div>
              <span className="text-[10px] text-ink-400 font-mono whitespace-nowrap mt-0.5">{timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
