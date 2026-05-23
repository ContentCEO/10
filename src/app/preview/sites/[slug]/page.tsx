import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteContent } from "@/lib/launchpad/types";
import { ClassicHero } from "./template-classic-hero";

interface Params { params: { slug: string } }

export const dynamic = "force-dynamic";

async function loadSite(slug: string) {
  const supabase = createAdminClient();
  const { data: site } = await supabase
    .from("cf_launchpad_sites")
    .select("id, slug, template, content, prospect_id, view_count")
    .eq("slug", slug)
    .maybeSingle();
  if (!site) return null;

  const { data: prospect } = await supabase
    .from("cf_launchpad_prospects")
    .select("business_name, category, city, state, rating, review_count")
    .eq("id", site.prospect_id)
    .single();

  await supabase
    .from("cf_launchpad_sites")
    .update({
      view_count: (site.view_count ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", site.id);

  return { site, prospect };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const loaded = await loadSite(params.slug);
  if (!loaded) return { title: "Not found" };
  const c = loaded.site.content as SiteContent;
  return {
    title: c.seo?.title ?? loaded.prospect?.business_name ?? "Preview",
    description: c.seo?.description ?? undefined,
    keywords: c.seo?.keywords?.join(", "),
    robots: { index: false, follow: false },
  };
}

export default async function GeneratedSite({ params }: Params) {
  const loaded = await loadSite(params.slug);
  if (!loaded) return notFound();
  const content = loaded.site.content as SiteContent;
  return <ClassicHero slug={params.slug} content={content} />;
}
