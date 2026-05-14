import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BulkLeadsClient } from "./BulkLeadsClient";

export const dynamic = "force-dynamic";

export default async function BulkLeadsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let q = supabase.from("leads")
    .select("id,name,status,service_type,ai_score,created_at,price,source")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (searchParams?.status && searchParams.status !== "all") {
    q = q.eq("status", searchParams.status);
  }

  const { data: rows } = await q;
  const leads = (rows ?? []) as Array<{
    id: string; name: string; status: string; service_type: string | null;
    ai_score: number | null; created_at: string; price: number | null; source: string | null;
  }>;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Layers className="h-3.5 w-3.5" /> Pipeline · Bulk Actions</span>
          <h1 className="mt-2 display-h2">
            Mass-edit a <em>pile</em> of leads
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Select up to 200 leads, then update status or delete in one call.
            Useful for cleaning out marketplace claims, bulk-archiving stale
            leads, or re-categorizing.
          </p>
        </div>
      </header>

      <BulkLeadsClient leads={leads} currentStatus={searchParams?.status ?? "all"} />
    </div>
  );
}
