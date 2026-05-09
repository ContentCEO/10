import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GeneratePanel from "./GeneratePanel";

export default async function DashboardHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { count: draftCount }, { count: scheduledCount }] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("content_items").select("*", { count: "exact", head: true })
      .eq("user_id", user!.id).eq("status", "draft"),
    supabase.from("content_items").select("*", { count: "exact", head: true })
      .eq("user_id", user!.id).eq("status", "scheduled"),
  ]);

  if (!profile) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Welcome 👋</h1>
        <div className="mt-6 card">
          <p className="text-slate-600">
            First, set up your business profile so we can generate content that sounds like you.
          </p>
          <Link href="/dashboard/profile" className="btn-primary mt-4">
            Set up business profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Generate content</h1>
          <p className="mt-1 text-slate-600">
            One click for a full month — or generate a single post on demand.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="card !p-3 !shadow-none min-w-[100px]">
            <div className="text-slate-500">Drafts</div>
            <div className="text-xl font-semibold">{draftCount ?? 0}</div>
          </div>
          <div className="card !p-3 !shadow-none min-w-[100px]">
            <div className="text-slate-500">Scheduled</div>
            <div className="text-xl font-semibold">{scheduledCount ?? 0}</div>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <GeneratePanel businessName={profile.business_name} />
      </div>
    </div>
  );
}
