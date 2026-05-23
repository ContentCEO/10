import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Send, Sparkles, Users, Globe, DollarSign, AlertTriangle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { isOutboundConfigured, isTestMode } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export default async function AutoOutreachDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();

  // Stats — counts by stage.
  const [totals, recentLogs, recentProspects, conversions] = await Promise.all([
    admin.from("ao_prospects").select("scan_status,generate_status,outreach_status"),
    admin.from("ao_outreach_log").select("id,channel,status,created_at,prospect_id").order("created_at", { ascending: false }).limit(10),
    admin.from("ao_prospects").select("id,business_name,city,scan_status,generate_status,outreach_status,created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("ao_subscriptions").select("amount_cents,plan,status").eq("status", "active"),
  ]);

  const all = totals.data ?? [];
  const stats = {
    prospects: all.length,
    scanned:   all.filter((r) => r.scan_status === "done").length,
    generated: all.filter((r) => r.generate_status === "done").length,
    sent:      all.filter((r) => r.outreach_status === "sent" || r.outreach_status === "replied" || r.outreach_status === "converted").length,
    replied:   all.filter((r) => r.outreach_status === "replied").length,
    converted: all.filter((r) => r.outreach_status === "converted").length,
  };

  const revenueCents = (conversions.data ?? []).reduce((sum, s) => sum + (s.amount_cents ?? 0), 0);
  const replyRate = stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;
  const convRate  = stats.sent > 0 ? Math.round((stats.converted / stats.sent) * 100) : 0;
  const outbound = isOutboundConfigured();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-300 font-semibold">Auto-Outreach</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold">Local-business engine</h1>
          <p className="mt-1 text-sm text-white/70 max-w-2xl">
            Discover local businesses, AI-scan their digital presence, generate a personalized
            landing page + ad strategy, and pitch them — all in one pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/owner/auto-outreach/discover"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold shadow-glow"
          >
            <Plus className="h-4 w-4" /> Discover new prospects
          </Link>
          <Link
            href="/owner/auto-outreach/prospects"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold"
          >
            <Users className="h-4 w-4" /> All prospects
          </Link>
        </div>
      </header>

      <ConfigBanner outbound={outbound} testMode={isTestMode()} hasPlaces={Boolean(process.env.GOOGLE_PLACES_API_KEY)} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={<Users className="h-4 w-4" />}    label="Prospects" value={stats.prospects} />
        <Stat icon={<Activity className="h-4 w-4" />} label="Scanned"   value={stats.scanned} />
        <Stat icon={<Globe className="h-4 w-4" />}    label="Sites built" value={stats.generated} />
        <Stat icon={<Send className="h-4 w-4" />}     label="Outreach sent" value={stats.sent} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label={`Reply rate ${replyRate}%`} value={stats.replied} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label={`Conv ${convRate}%`} value={`$${(revenueCents / 100).toFixed(0)}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Latest prospects" linkHref="/owner/auto-outreach/prospects" linkLabel="View all →">
          {recentProspects.data?.length ? (
            <ul className="divide-y divide-white/10">
              {recentProspects.data.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/owner/auto-outreach/prospects/${p.id}`} className="font-semibold hover:underline truncate block">
                      {p.business_name}
                    </Link>
                    <div className="text-xs text-white/60 truncate">{p.city ?? "—"}</div>
                  </div>
                  <PipelineDots scan={p.scan_status} gen={p.generate_status} out={p.outreach_status} />
                </li>
              ))}
            </ul>
          ) : <Empty msg="No prospects yet — discover some to get started." />}
        </Panel>

        <Panel title="Latest outreach" linkHref="/owner/auto-outreach/prospects" linkLabel="View all →">
          {recentLogs.data?.length ? (
            <ul className="divide-y divide-white/10">
              {recentLogs.data.map((l) => (
                <li key={l.id} className="py-3 text-sm flex items-center justify-between gap-3">
                  <span className="capitalize">{l.channel}</span>
                  <StatusPill status={l.status} />
                  <span className="text-xs text-white/60">{new Date(l.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : <Empty msg="No outreach sent yet." />}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-2 text-xs text-white/60">{icon} {label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, linkHref, linkLabel, children }: { title: string; linkHref?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{title}</h2>
        {linkHref && <Link href={linkHref} className="text-xs text-brand-300 hover:underline">{linkLabel}</Link>}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) { return <div className="py-8 text-center text-sm text-white/50">{msg}</div>; }

function PipelineDots({ scan, gen, out }: { scan: string; gen: string; out: string }) {
  return (
    <div className="flex gap-1">
      <Dot ok={scan === "done"} err={scan === "error"} title={`Scan: ${scan}`} />
      <Dot ok={gen === "done"}  err={gen === "error"}  title={`Generate: ${gen}`} />
      <Dot ok={out === "sent" || out === "replied" || out === "converted"} err={false} title={`Outreach: ${out}`} />
    </div>
  );
}
function Dot({ ok, err, title }: { ok: boolean; err: boolean; title: string }) {
  return (
    <span
      title={title}
      className={`h-2.5 w-2.5 rounded-full ${err ? "bg-red-500" : ok ? "bg-emerald-500" : "bg-white/20"}`}
    />
  );
}
function StatusPill({ status }: { status: string }) {
  const color =
    status === "sent"     ? "bg-emerald-500/15 text-emerald-300" :
    status === "failed"   ? "bg-red-500/15 text-red-300" :
    status === "replied"  ? "bg-amber-500/15 text-amber-200" :
    status === "clicked"  ? "bg-sky-500/15 text-sky-300" :
    "bg-white/10 text-white/70";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${color}`}>{status}</span>;
}

function ConfigBanner({ outbound, testMode, hasPlaces }: { outbound: { sms: boolean; email: boolean }; testMode: boolean; hasPlaces: boolean }) {
  const issues: string[] = [];
  if (!hasPlaces) issues.push("Google Places not configured — discovery uses synthetic demo data.");
  if (!outbound.email) issues.push("Resend not configured — email outreach will be skipped.");
  if (!outbound.sms) issues.push("Twilio not configured — SMS outreach will be skipped.");
  if (!issues.length && !testMode) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm flex gap-3">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div>
        {testMode && <div className="font-semibold">TEST_MODE is on — outbound sends are logged, not delivered.</div>}
        {issues.map((m, i) => <div key={i}>{m}</div>)}
      </div>
    </div>
  );
}
