import Link from "next/link";
import { getProfile, getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function BusinessListPage() {
  await getUserOrRedirect();
  const profile = await getProfile();
  const supabase = createClient();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
        <Link href="/onboarding" className="btn-primary">+ Add business</Link>
      </div>

      {!businesses || businesses.length === 0 ? (
        <div className="card mt-6 text-sm text-zinc-600">
          No businesses yet. <Link href="/onboarding" className="text-forge-700 hover:underline">Set one up →</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{b.name}</h3>
                {b.industry && (
                  <span className="badge bg-zinc-100 text-zinc-700">{b.industry}</span>
                )}
              </div>
              {b.description && <p className="mt-2 text-sm text-zinc-700">{b.description}</p>}
              {b.target_audience && (
                <p className="mt-2 text-sm text-zinc-500"><span className="font-medium">Audience:</span> {b.target_audience}</p>
              )}
              {b.brand_voice && (
                <p className="mt-1 text-sm text-zinc-500"><span className="font-medium">Voice:</span> {b.brand_voice}</p>
              )}
              {b.unique_value_prop && (
                <p className="mt-1 text-sm text-zinc-500"><span className="font-medium">UVP:</span> {b.unique_value_prop}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
