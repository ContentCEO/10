import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { buildPreviewUrl } from "@/lib/auto-outreach/pipeline";
import {
  Star, Globe, Phone, Mail, MapPin, AlertTriangle, Lightbulb,
  ExternalLink, ShieldOff,
} from "lucide-react";
import { ProspectActions } from "./ProspectActions";

interface Params { params: { id: string } }
export const dynamic = "force-dynamic";

export default async function ProspectDetail({ params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: prospect } = await admin.from("ao_prospects").select("*").eq("id", params.id).maybeSingle();
  if (!prospect) return notFound();

  const [{ data: scan }, { data: site }, { data: ads }, { data: logs }] = await Promise.all([
    admin.from("ao_scans").select("*").eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("ao_sites").select("*").eq("prospect_id", prospect.id).maybeSingle(),
    admin.from("ao_ad_strategies").select("*").eq("prospect_id", prospect.id),
    admin.from("ao_outreach_log").select("*").eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false }).limit(20),
  ]);

  const previewUrl = site ? buildPreviewUrl(site.slug) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/owner/auto-outreach/prospects" className="text-xs text-white/60 hover:text-white">
            ← All prospects
          </Link>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold">{prospect.business_name}</h1>
          <div className="mt-1 text-sm text-white/70">
            {prospect.category ?? "—"}{prospect.city ? ` · ${prospect.city}` : ""}{prospect.state ? `, ${prospect.state}` : ""}
            {prospect.rating ? (
              <span className="ml-3 inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{prospect.rating} ({prospect.review_count ?? 0})
              </span>
            ) : null}
          </div>
        </div>
        <ProspectActions
          prospectId={prospect.id}
          hasScan={Boolean(scan)}
          hasSite={Boolean(site)}
          previewUrl={previewUrl}
          canEmail={Boolean(prospect.email)}
          canSms={Boolean(prospect.phone)}
          dnc={prospect.do_not_contact}
        />
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <ContactCard icon={<Globe className="h-4 w-4" />} label="Website" value={prospect.website_url} link={prospect.website_url} />
        <ContactCard icon={<Phone className="h-4 w-4" />} label="Phone" value={prospect.phone} link={prospect.phone ? `tel:${prospect.phone}` : null} />
        <ContactCard icon={<Mail className="h-4 w-4" />}  label="Email" value={prospect.email} link={prospect.email ? `mailto:${prospect.email}` : null} />
        <ContactCard icon={<MapPin className="h-4 w-4" />} label="Address" value={prospect.address} />
      </div>

      {prospect.do_not_contact && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm inline-flex items-center gap-2">
          <ShieldOff className="h-4 w-4" /> Do not contact — outreach is blocked for this prospect.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <ScanPanel scan={scan} />
        <SitePanel site={site} previewUrl={previewUrl} />
      </div>

      <AdsPanel ads={ads ?? []} />
      <OutreachLogPanel logs={logs ?? []} />
    </div>
  );
}

function ContactCard({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string | null; link?: string | null }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="text-xs text-white/60 flex items-center gap-2">{icon} {label}</div>
      <div className="mt-1 text-sm font-medium truncate">
        {link
          ? <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{value ?? "—"}</a>
          : (value ?? "—")}
      </div>
    </div>
  );
}

function ScanPanel({ scan }: { scan: any }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h2 className="font-semibold mb-3">Scan & audit</h2>
      {!scan ? (
        <div className="py-8 text-center text-sm text-white/50">No scan yet — click "Run Scan".</div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 mb-4">
            <ScoreBar label="Speed" value={scan.score_speed} />
            <ScoreBar label="Design" value={scan.score_design} />
            <ScoreBar label="SEO" value={scan.score_seo} />
            <ScoreBar label="Conv" value={scan.score_conversion} />
            <ScoreBar label="Overall" value={scan.score_overall} />
          </div>
          {scan.summary && <p className="text-sm text-white/80 mb-4">{scan.summary}</p>}

          {scan.weaknesses?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider text-red-300 font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Weaknesses
              </div>
              <ul className="space-y-1 text-sm text-white/80">
                {scan.weaknesses.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
          {scan.opportunities?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Opportunities
              </div>
              <ul className="space-y-1 text-sm text-white/80">
                {scan.opportunities.map((w: string, i: number) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
          {scan.competitors?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-1">Top competitors</div>
              <ul className="space-y-1 text-sm text-white/80">
                {scan.competitors.map((c: any, i: number) => (
                  <li key={i}>
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-white/50">— {c.edge}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <div className="text-xl font-bold mt-1">{value ?? "—"}</div>
      <div className="mt-1 h-1.5 rounded bg-white/10 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function SitePanel({ site, previewUrl }: { site: any; previewUrl: string | null }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h2 className="font-semibold mb-3">Generated site</h2>
      {!site ? (
        <div className="py-8 text-center text-sm text-white/50">No site yet — click "Generate Site".</div>
      ) : (
        <>
          <div className="text-sm space-y-2 mb-4">
            <Row label="Slug" value={site.slug} />
            <Row label="Template" value={site.template} />
            <Row label="Views" value={String(site.view_count ?? 0)} />
            <Row label="Last viewed" value={site.last_viewed_at ? new Date(site.last_viewed_at).toLocaleString() : "—"} />
          </div>
          {site.content?.hero && (
            <div className="rounded-lg bg-white/5 p-3 mb-4">
              <div className="text-xs text-white/60 mb-1">Hero</div>
              <div className="font-semibold">{site.content.hero.headline}</div>
              <div className="text-sm text-white/70 mt-1">{site.content.hero.sub}</div>
            </div>
          )}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold"
            >
              Open preview <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <span className="font-medium truncate text-right">{value}</span>
    </div>
  );
}

function AdsPanel({ ads }: { ads: any[] }) {
  if (!ads.length) return null;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h2 className="font-semibold mb-3">Ad strategy</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {ads.map((a) => (
          <div key={a.id} className="rounded-xl bg-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold uppercase text-sm">{a.platform}</div>
              <div className="text-xs text-white/60">
                ${Math.round((a.monthly_budget_low ?? 0) / 100)}-${Math.round((a.monthly_budget_high ?? 0) / 100)}/mo
              </div>
            </div>
            <p className="text-sm text-white/80 mb-3">{a.rationale}</p>
            <div className="text-xs text-white/60 mb-1">Target audience</div>
            <p className="text-sm mb-3">{a.target_audience}</p>
            <div className="text-xs text-white/60 mb-1">Keywords / signals</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {(a.keywords ?? []).slice(0, 12).map((k: string) => (
                <span key={k} className="text-[11px] bg-white/10 rounded px-2 py-0.5">{k}</span>
              ))}
            </div>
            <div className="text-xs text-white/60 mb-1">Expected CPL</div>
            <div className="text-sm mb-3">${Math.round((a.expected_cpl_low ?? 0) / 100)} – ${Math.round((a.expected_cpl_high ?? 0) / 100)}</div>
            {a.ad_copy?.length > 0 && (
              <>
                <div className="text-xs text-white/60 mb-1">Ad copy</div>
                <ul className="space-y-1 text-sm">
                  {a.ad_copy.slice(0, 3).map((c: any, i: number) => (
                    <li key={i} className="border-l-2 border-brand-500 pl-2">
                      <div className="font-medium">{c.headline}</div>
                      <div className="text-white/70 text-xs">{c.description}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutreachLogPanel({ logs }: { logs: any[] }) {
  if (!logs.length) return null;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h2 className="font-semibold mb-3">Outreach log</h2>
      <div className="space-y-3">
        {logs.map((l) => (
          <div key={l.id} className="rounded-lg bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between mb-1 gap-3">
              <span className="font-medium capitalize">{l.channel} → {l.to_address}</span>
              <span className="text-xs text-white/60">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            {l.subject && <div className="text-xs text-white/60 mb-1">Subject: {l.subject}</div>}
            <pre className="whitespace-pre-wrap text-white/80 text-xs">{l.body}</pre>
            <div className="mt-2 flex gap-2 text-[10px] uppercase">
              <span className="px-2 py-0.5 rounded-full bg-white/10">{l.status}</span>
              {l.test_mode && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">test mode</span>}
              {l.error && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-200">{l.error}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
