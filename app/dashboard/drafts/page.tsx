import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import DraftsList from "./DraftsList";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Content drafts</h1>
          <p className="mt-1 text-slate-600">Edit, schedule, publish, or export to CSV.</p>
        </div>
        <a href="/api/export-csv" className="btn-secondary">Export CSV</a>
      </div>
      <div className="mt-6">
        <DraftsList items={(data ?? []) as ContentItem[]} />
      </div>
    </div>
  );
}
