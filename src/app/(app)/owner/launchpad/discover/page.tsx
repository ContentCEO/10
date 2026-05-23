import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { DiscoverForm } from "./DiscoverForm";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const hasPlaces = Boolean(process.env.GOOGLE_PLACES_API_KEY);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-white/80"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#C44A26" }} />Contractor Flow Launchpad</div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold">Discover new prospects</h1>
        <p className="mt-2 text-sm text-white/70">
          Pulls local businesses from Google Places and inserts them as prospects. Existing matches
          (by Place ID) are updated, not duplicated.
        </p>
      </header>

      {!hasPlaces && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm">
          <strong>Demo mode:</strong> GOOGLE_PLACES_API_KEY isn't set. Discovery will insert synthetic
          businesses so you can exercise the full pipeline. Set it in your env to pull real data.
        </div>
      )}

      <DiscoverForm />
    </div>
  );
}
