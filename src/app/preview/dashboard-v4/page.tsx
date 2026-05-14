import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FollowUp, Lead } from "@/lib/types";
import DashboardV4Client from "./DashboardV4Client";
import type { MapMarker } from "./LeafletMap";
import { StuckLeadAlert } from "@/app/(app)/dashboard/StuckLeadAlert";
import { YearOverYear } from "@/components/YearOverYear";
import { ARAging } from "@/components/ARAging";
import { ProfitInsights } from "@/components/ProfitInsights";
import { SourceChannelRoi } from "@/components/SourceChannelRoi";
import { SourceRoi } from "@/components/SourceRoi";

export const dynamic = "force-dynamic";

interface MarketplaceFlagged {
  id: string;
  service_type: string | null;
  city: string | null;
  ai_score: number | null;
  price_cents: number;
  source_channel: string;
  notes: string | null;
}

export default async function DashboardV4Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [
    { count: leadCount },
    { count: activeJobCount },
    { data: completedJobs },
    { data: todayCompletedJobs },
    { count: leadsLast24hRaw },
    { data: dueFollowUpsRaw },
    { data: recentLeadsRaw },
    { data: profileRaw },
    { data: pipelineLeadsRaw },
    { data: leadGeoRaw },
    { data: jobGeoRaw },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"]),
    supabase.from("jobs").select("price").eq("status", "completed"),
    supabase.from("jobs").select("price").eq("status", "completed")
      .gte("updated_at", startOfDay).lt("updated_at", endOfDay),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("follow_ups").select("*").is("completed_at", null)
      .gte("due_at", startOfDay).lt("due_at", endOfDay).order("due_at"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("business_name,credit_cents,preferences").eq("id", user.id).single(),
    supabase.from("leads").select("id,name,status,service_type,price")
      .order("updated_at", { ascending: false }).limit(40),
    // Geocoded leads — gracefully empty if migration not applied yet.
    supabase.from("leads").select("id,name,status,service_type,price,lat,lng")
      .not("lat", "is", null).not("lng", "is", null).limit(100),
    supabase.from("jobs").select("id,title,status,price,lat,lng")
      .not("lat", "is", null).not("lng", "is", null).limit(100),
  ]);

  const admin = createAdminClient();
  const { data: hot } = await admin
    .from("marketplace_leads")
    .select("id,service_type,city,ai_score,price_cents,source_channel,notes")
    .eq("status", "available")
    .gte("ai_score", 70)
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextBest = hot as MarketplaceFlagged | null;

  const completed = (completedJobs ?? []) as { price: number | null }[];
  const todayCompleted = (todayCompletedJobs ?? []) as { price: number | null }[];
  const revenue = completed.reduce((sum, j) => sum + (j.price ?? 0), 0);
  const earnedToday = todayCompleted.reduce((sum, j) => sum + (j.price ?? 0), 0);

  const STAGE_PROB: Record<string, number> = {
    new: 0.10, contacted: 0.25, estimate: 0.40, estimate_sent: 0.40, won: 1.00, lost: 0,
  };
  const pipeline = (pipelineLeadsRaw ?? []) as Array<{ id: string; name: string; status: string; service_type: string | null; price: number | null }>;
  const forecast = pipeline
    .filter((l) => l.status !== "won" && l.status !== "lost" && l.price)
    .reduce((sum, l) => sum + (l.price ?? 0) * (STAGE_PROB[l.status ?? "new"] ?? 0.10), 0);

  const leadsLast24h = leadsLast24hRaw ?? 0;
  const followUps = (dueFollowUpsRaw as FollowUp[] | null) ?? [];
  const leads = (recentLeadsRaw as Lead[] | null) ?? [];
  const profile = profileRaw as { business_name: string | null; credit_cents: number; preferences: { density?: string } | null } | null;

  // Build the morning brief.
  const briefParts: string[] = [];
  if (leadsLast24h > 0) briefParts.push(`${leadsLast24h} new lead${leadsLast24h === 1 ? "" : "s"} since yesterday`);
  if (followUps.length > 0) briefParts.push(`${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due today`);
  if (earnedToday > 0) briefParts.push(`$${earnedToday.toLocaleString()} invoiced today`);
  const brief = briefParts.length > 0
    ? `Today: ${briefParts.join(" · ")}.`
    : "All quiet so far today — good time to claim some marketplace leads.";

  // Today's mission.
  const mission: Array<{ kind: "followup" | "lead"; title: string; href: string }> = [];
  for (const f of followUps.slice(0, 2)) {
    mission.push({ kind: "followup", title: f.title, href: f.lead_id ? `/leads/${f.lead_id}` : "/calendar" });
  }
  for (const l of leads.filter((x) => (x.status ?? "new") === "new").slice(0, 3 - mission.length)) {
    mission.push({ kind: "lead", title: `Reach out to ${l.name}${l.service_type ? ` · ${l.service_type}` : ""}`, href: `/leads/${l.id}` });
  }

  // Build map markers from geocoded leads + jobs.
  type LeadGeo = { id: string; name: string; status: string | null; service_type: string | null; price: number | null; lat: number; lng: number };
  type JobGeo  = { id: string; title: string; status: string | null; price: number | null; lat: number; lng: number };
  const leadGeo = (leadGeoRaw ?? []) as LeadGeo[];
  const jobGeo  = (jobGeoRaw  ?? []) as JobGeo[];
  const markers: MapMarker[] = [
    ...leadGeo.map((l): MapMarker => ({
      id: l.id, kind: "lead", name: l.name, status: l.status, city: null,
      lat: l.lat, lng: l.lng, service_type: l.service_type, price: l.price,
    })),
    ...jobGeo.map((j): MapMarker => ({
      id: j.id, kind: "job", name: j.title, status: j.status, city: null,
      lat: j.lat, lng: j.lng, service_type: null, price: j.price,
    })),
  ];

  const businessName = profile?.business_name ?? null;
  const walletDollars = ((profile?.credit_cents ?? 0) / 100).toFixed(2);
  const lowWallet = (profile?.credit_cents ?? 0) < 5000;

  return (
    <DashboardV4Client
      businessName={businessName}
      walletDollars={walletDollars}
      lowWallet={lowWallet}
      brief={brief}
      mission={mission}
      nextBest={nextBest}
      pipeline={pipeline}
      kpis={{
        leadCount: leadCount ?? 0,
        activeJobCount: activeJobCount ?? 0,
        forecast: Math.round(forecast),
        earnedToday,
        revenue,
        dueToday: followUps.length,
      }}
      followUps={followUps}
      recentLeads={leads}
      mapMarkers={markers}
      hqLat={null}
      hqLng={null}
      stuckAlertSlot={<StuckLeadAlert />}
      insightsSlot={
        <>
          <YearOverYear />
          <ARAging />
          <ProfitInsights />
          <SourceChannelRoi />
          <SourceRoi />
        </>
      }
    />
  );
}
