import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile, getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { CreativeCard } from "@/components/CreativeCard";
import { CampaignStructureCard } from "@/components/CampaignStructureCard";
import { DeleteCampaignButton } from "./DeleteCampaignButton";
import type { AdCreative, CampaignStructure } from "@/lib/types";

export default async function CampaignPage({ params }: { params: { id: string } }) {
  await getUserOrRedirect();
  const profile = await getProfile();
  const supabase = createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!campaign) notFound();

  const { data: creatives } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("campaign_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <AppShell profile={profile}>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">← Back</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{campaign.name}</h1>
          <p className="text-sm text-zinc-500">
            {campaign.platform} · {campaign.objective}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/campaigns/${campaign.id}/export`}
            className="btn-outline"
          >
            Export CSV
          </a>
          <DeleteCampaignButton id={campaign.id} />
        </div>
      </div>

      {campaign.structure && (
        <div className="mt-6">
          <CampaignStructureCard structure={campaign.structure as CampaignStructure} />
        </div>
      )}

      <h2 className="text-lg font-semibold mt-8">
        Creatives ({creatives?.length ?? 0})
      </h2>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(creatives ?? []).map((c: any) => (
          <CreativeCard key={c.id} creative={c as AdCreative} />
        ))}
      </div>
    </AppShell>
  );
}
