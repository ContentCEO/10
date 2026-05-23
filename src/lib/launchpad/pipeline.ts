// End-to-end orchestrator: discover → scan → generate → outreach.
// Each step is independently retriable and updates per-stage status columns
// so a partial failure doesn't burn the whole prospect.

import { createAdminClient } from "@/lib/supabase/admin";
import { discoverFromPlaces, toProspectInsert } from "./places";
import { scanProspect } from "./scanner";
import { generateSite, slugFor } from "./generator";
import { generateAdStrategies } from "./ads";
import { sendOutreach } from "./outreach";
import type { Channel, Prospect, ScanResult, SiteContent } from "./types";

export interface DiscoverInput {
  query: string;
  category: string;
  maxResults?: number;
}

export async function runDiscover(input: DiscoverInput): Promise<{ inserted: number; duplicates: number; prospect_ids: string[] }> {
  const supabase = createAdminClient();
  const found = await discoverFromPlaces(input);

  let inserted = 0;
  let duplicates = 0;
  const ids: string[] = [];

  for (const b of found) {
    const insert = toProspectInsert(b);
    const { data, error } = await supabase
      .from("cf_launchpad_prospects")
      .upsert(insert, { onConflict: "google_place_id", ignoreDuplicates: false })
      .select("id, created_at, updated_at")
      .single();
    if (error) continue;
    ids.push(data.id);
    // Heuristic: if created_at equals updated_at it's a fresh insert.
    if (data.created_at === data.updated_at) inserted++;
    else duplicates++;
  }

  return { inserted, duplicates, prospect_ids: ids };
}

export async function runScan(prospectId: string): Promise<ScanResult> {
  const supabase = createAdminClient();
  const { data: prospect, error } = await supabase
    .from("cf_launchpad_prospects").select("*").eq("id", prospectId).single();
  if (error || !prospect) throw new Error(`Prospect not found: ${prospectId}`);

  await supabase.from("cf_launchpad_prospects")
    .update({ scan_status: "running", scan_error: null })
    .eq("id", prospectId);

  try {
    const scan = await scanProspect(prospect as Prospect);

    await supabase.from("cf_launchpad_scans").insert({
      prospect_id: prospect.id,
      website_html_size: scan.website_html_size,
      website_title: scan.website_title,
      website_meta_desc: scan.website_meta_desc,
      detected_services: scan.detected_services,
      detected_colors: scan.detected_colors,
      detected_logos: scan.detected_logos,
      score_speed: scan.score_speed,
      score_design: scan.score_design,
      score_seo: scan.score_seo,
      score_conversion: scan.score_conversion,
      score_overall: scan.score_overall,
      summary: scan.summary,
      weaknesses: scan.weaknesses,
      opportunities: scan.opportunities,
      competitors: scan.competitors,
    });

    await supabase.from("cf_launchpad_prospects")
      .update({ scan_status: "done" })
      .eq("id", prospectId);
    return scan;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "scan failed";
    await supabase.from("cf_launchpad_prospects")
      .update({ scan_status: "error", scan_error: msg })
      .eq("id", prospectId);
    throw e;
  }
}

export async function runGenerate(prospectId: string): Promise<{ slug: string; site: SiteContent }> {
  const supabase = createAdminClient();
  const { data: prospect, error } = await supabase
    .from("cf_launchpad_prospects").select("*").eq("id", prospectId).single();
  if (error || !prospect) throw new Error(`Prospect not found: ${prospectId}`);

  // Pull most recent scan; if missing, run one now.
  let { data: scan } = await supabase
    .from("cf_launchpad_scans").select("*").eq("prospect_id", prospectId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!scan) {
    await runScan(prospectId);
    const refetched = await supabase
      .from("cf_launchpad_scans").select("*").eq("prospect_id", prospectId)
      .order("created_at", { ascending: false }).limit(1).single();
    scan = refetched.data!;
  }

  await supabase.from("cf_launchpad_prospects")
    .update({ generate_status: "running", generate_error: null })
    .eq("id", prospectId);

  try {
    const scanObj: ScanResult = {
      prospect_id: prospectId,
      website_html_size: scan.website_html_size,
      website_title: scan.website_title,
      website_meta_desc: scan.website_meta_desc,
      detected_services: scan.detected_services ?? [],
      detected_colors: scan.detected_colors ?? [],
      detected_logos: scan.detected_logos ?? [],
      score_speed: scan.score_speed,
      score_design: scan.score_design,
      score_seo: scan.score_seo,
      score_conversion: scan.score_conversion,
      score_overall: scan.score_overall,
      summary: scan.summary ?? "",
      weaknesses: scan.weaknesses ?? [],
      opportunities: scan.opportunities ?? [],
      competitors: scan.competitors ?? [],
    };

    const [site, adStrategies] = await Promise.all([
      generateSite(prospect as Prospect, scanObj),
      generateAdStrategies(prospect as Prospect, scanObj),
    ]);

    const slug = await ensureUniqueSlug(slugFor(prospect as Prospect));

    await supabase.from("cf_launchpad_sites").upsert(
      {
        prospect_id: prospect.id,
        slug,
        template: "classic-hero",
        content: site,
      },
      { onConflict: "prospect_id" },
    );

    // Replace any prior ad strategies for clarity.
    await supabase.from("cf_launchpad_ad_strategies").delete().eq("prospect_id", prospect.id);
    for (const s of adStrategies) {
      await supabase.from("cf_launchpad_ad_strategies").insert({
        prospect_id: prospect.id,
        platform: s.platform,
        monthly_budget_low: s.monthly_budget_low,
        monthly_budget_high: s.monthly_budget_high,
        target_audience: s.target_audience,
        keywords: s.keywords,
        ad_copy: s.ad_copy,
        landing_strategy: s.landing_strategy,
        expected_cpl_low: s.expected_cpl_low,
        expected_cpl_high: s.expected_cpl_high,
        rationale: s.rationale,
      });
    }

    await supabase.from("cf_launchpad_prospects")
      .update({ generate_status: "done" })
      .eq("id", prospectId);
    return { slug, site };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate failed";
    await supabase.from("cf_launchpad_prospects")
      .update({ generate_status: "error", generate_error: msg })
      .eq("id", prospectId);
    throw e;
  }
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const supabase = createAdminClient();
  let slug = base;
  let n = 1;
  while (true) {
    const { data } = await supabase.from("cf_launchpad_sites").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
    if (n > 50) return `${base}-${Date.now().toString(36)}`;
  }
}

export async function runOutreach(prospectId: string, channel: Channel, campaignId?: string | null) {
  const supabase = createAdminClient();
  const { data: prospect, error: pErr } = await supabase
    .from("cf_launchpad_prospects").select("*").eq("id", prospectId).single();
  if (pErr || !prospect) throw new Error(`Prospect not found: ${prospectId}`);

  const { data: site } = await supabase
    .from("cf_launchpad_sites").select("slug").eq("prospect_id", prospectId).maybeSingle();
  if (!site) throw new Error("No generated site yet — run generate first");

  const { data: scan } = await supabase
    .from("cf_launchpad_scans").select("summary, weaknesses").eq("prospect_id", prospectId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  let campaignTemplate: { subject?: string | null; body: string } | null = null;
  if (campaignId) {
    const { data: c } = await supabase
      .from("cf_launchpad_campaigns").select("subject_tpl, body_tpl").eq("id", campaignId).single();
    if (c) campaignTemplate = { subject: c.subject_tpl, body: c.body_tpl };
  }

  const previewUrl = buildPreviewUrl(site.slug);

  return sendOutreach({
    prospect: prospect as Prospect,
    channel,
    previewUrl,
    campaignId,
    scanSummary: scan?.summary ?? null,
    weaknesses: scan?.weaknesses ?? [],
    campaignTemplate,
  });
}

// Per brief Section 6: preview URLs live at preview.contractorflow.com/[slug]
// — a single dedicated subdomain with path-based per-prospect routing.
// Middleware rewrites preview.contractorflow.com/{slug} → /preview/sites/{slug}.
export function buildPreviewUrl(slug: string): string {
  const previewDomain = process.env.NEXT_PUBLIC_LAUNCHPAD_PREVIEW_DOMAIN;
  if (previewDomain) return `https://${previewDomain}/${slug}`;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/preview/sites/${slug}`;
}

// Full end-to-end run for a single prospect (used by the dashboard "Run All" button).
export async function runFullPipeline(prospectId: string, channel: Channel) {
  await runScan(prospectId);
  await runGenerate(prospectId);
  return runOutreach(prospectId, channel);
}
