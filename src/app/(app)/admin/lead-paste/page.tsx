import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";
import { PasteForm } from "./PasteForm";

export const dynamic = "force-dynamic";

export default async function LeadPastePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <div className="max-w-xl">
        <div className="card p-8 text-center">
          <ShieldCheck className="h-10 w-10 text-amber-500 mx-auto" />
          <h1 className="mt-3 text-xl font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-ink-600">
            Lead paste is restricted to admin accounts. If you need access,
            ask the workspace owner to promote your profile.
          </p>
          <Link href="/dashboard" className="btn-secondary mt-6 inline-flex">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin · Lead paste
          </span>
          <h1 className="mt-2 display-h2">
            <span className="gradient-text">Manual lead intake</span>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Paste leads pulled from Nextdoor, Facebook groups, MA state license
            rosters, or property-deed exports. Each row is deduped, auto-categorized,
            and routed through your curation queue.
          </p>
        </div>
      </header>

      <PasteForm />
    </div>
  );
}
