import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { Campaign } from "@/lib/types";

export default async function CampaignsPage() {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false });
  const campaigns = (data ?? []) as Campaign[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-slate-600 mt-1">Reusable AI message templates and sequences.</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">New campaign</Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-10 card p-10 text-center">
          <p className="text-slate-600">No campaigns yet.</p>
          <Link href="/campaigns/new" className="btn-primary mt-4 inline-flex">Create your first campaign</Link>
        </div>
      ) : (
        <ul className="mt-6 grid md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <li key={c.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="badge bg-slate-100 text-slate-700">{c.channel.toUpperCase()}</span>
              </div>
              {c.goal && <p className="mt-2 text-sm text-slate-600">{c.goal}</p>}
              <p className="mt-3 text-xs text-slate-500">{c.steps.length} step{c.steps.length === 1 ? "" : "s"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
