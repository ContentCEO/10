import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

interface Search { search?: string; status?: string }

export default async function ProspectsList({ searchParams }: { searchParams: Search }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  let q = admin.from("cf_launchpad_prospects")
    .select("id, business_name, category, city, state, rating, review_count, scan_status, generate_status, outreach_status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.search) {
    q = q.ilike("business_name", `%${searchParams.search}%`);
  }
  if (searchParams.status === "ready") {
    q = q.eq("generate_status", "done").eq("outreach_status", "pending");
  } else if (searchParams.status === "sent") {
    q = q.in("outreach_status", ["sent", "replied", "converted"]);
  }

  const { data: prospects } = await q;

  return (
    <div className="space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-white/80"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#C44A26" }} />Contractor Flow Launchpad</div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold">Prospects</h1>
      </header>

      <form className="flex gap-2 items-center flex-wrap" action="/owner/launchpad/prospects">
        <input
          name="search"
          defaultValue={searchParams.search ?? ""}
          placeholder="Search by name…"
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="ready">Ready to send</option>
          <option value="sent">Already contacted</option>
        </select>
        <button className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-sm font-medium">Filter</button>
        <Link href="/owner/launchpad/discover" className="rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold">
          + Discover more
        </Link>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
            <tr>
              <th className="text-left px-4 py-2">Business</th>
              <th className="text-left px-4 py-2">City</th>
              <th className="text-left px-4 py-2">Trade</th>
              <th className="text-left px-4 py-2">Rating</th>
              <th className="text-left px-4 py-2">Scan</th>
              <th className="text-left px-4 py-2">Site</th>
              <th className="text-left px-4 py-2">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(prospects ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <Link href={`/owner/launchpad/prospects/${p.id}`} className="font-semibold hover:underline">
                    {p.business_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/70">{p.city ?? "—"}{p.state ? `, ${p.state}` : ""}</td>
                <td className="px-4 py-3 text-white/70">{p.category ?? "—"}</td>
                <td className="px-4 py-3 text-white/70">
                  {p.rating ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}
                      <span className="text-white/40">({p.review_count ?? 0})</span>
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3"><Pill status={p.scan_status} /></td>
                <td className="px-4 py-3"><Pill status={p.generate_status} /></td>
                <td className="px-4 py-3"><Pill status={p.outreach_status} /></td>
              </tr>
            ))}
            {!prospects?.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-white/50">No prospects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: "bg-emerald-500/15 text-emerald-300",
    sent: "bg-emerald-500/15 text-emerald-300",
    converted: "bg-emerald-500/15 text-emerald-300",
    replied: "bg-amber-500/15 text-amber-200",
    running: "bg-sky-500/15 text-sky-200",
    queued: "bg-sky-500/15 text-sky-200",
    error: "bg-red-500/15 text-red-300",
    pending: "bg-white/10 text-white/60",
    unsubscribed: "bg-red-500/15 text-red-300",
  };
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${map[status] ?? "bg-white/10 text-white/60"}`}>{status}</span>;
}
