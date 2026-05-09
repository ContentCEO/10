import Link from "next/link";
import { getProfile, getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function DashboardPage() {
  await getUserOrRedirect();
  const profile = await getProfile();
  const supabase = createClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, objective, platform, created_at")
    .order("created_at", { ascending: false });

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name");

  return (
    <AppShell profile={profile}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/generator" className="btn-primary">+ New campaign</Link>
      </div>

      {(!businesses || businesses.length === 0) && (
        <div className="card mt-6">
          <h3 className="font-semibold">Set up your business first</h3>
          <p className="text-sm text-zinc-600">
            Add your business profile so we can write ads in your brand voice.
          </p>
          <Link href="/onboarding" className="btn-primary mt-4 inline-flex">
            Continue setup
          </Link>
        </div>
      )}

      <h2 className="text-lg font-semibold mt-8">Your campaigns</h2>
      {!campaigns || campaigns.length === 0 ? (
        <div className="card mt-3 text-sm text-zinc-600">
          You haven't generated any campaigns yet. <Link href="/generator" className="text-forge-700 hover:underline">Generate your first one →</Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${c.id}`}
              className="card hover:border-forge-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="badge bg-zinc-100 text-zinc-700">{c.platform}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">Objective: {c.objective}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
