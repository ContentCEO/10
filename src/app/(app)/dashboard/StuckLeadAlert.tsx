import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/*
 * Plan 1 / A-4 — Stuck-lead alert.
 *
 * Renders a banner if any active leads haven't been touched in 14+ days.
 * Server component — runs on every dashboard load, ~1 query.
 */

export async function StuckLeadAlert() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("status", "in", "(won,lost)")
    .lte("updated_at", cutoff);

  if (!count || count === 0) return null;

  return (
    <div className="rounded-2xl bg-amber-500/[0.08] ring-1 ring-amber-400/30 px-5 py-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <strong className="text-amber-200">{count} lead{count === 1 ? "" : "s"}</strong>
        <span className="text-white/80"> haven&apos;t been touched in 14+ days. They&apos;re cooling off.</span>
      </div>
      <Link href="/leads?stale=14" className="btn bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/30 text-xs px-3 py-1.5 shrink-0">
        Review stale →
      </Link>
    </div>
  );
}
