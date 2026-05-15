import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CheckCircle2, Facebook, ExternalLink, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { CopyField } from "@/app/(app)/integrations/CopyField";

export const dynamic = "force-dynamic";

export default async function MetaSetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const h = headers();
  const host = h.get("host") ?? "your-app.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const webhookUrl = `${baseUrl}/api/marketplace/meta`;

  const verifyTokenSet = Boolean(process.env.META_VERIFY_TOKEN);
  const appSecretSet   = Boolean(process.env.META_APP_SECRET);
  const pageTokenSet   = Boolean(process.env.META_PAGE_ACCESS_TOKEN);
  const allSet = verifyTokenSet && appSecretSet && pageTokenSet;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Facebook className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Facebook <em>Lead Ads</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Receive form-fill leads from Meta Ads directly into <code className="text-white/80">/marketplace</code>. Warm leads with name + phone come pre-qualified.
        </p>
      </header>

      <section className={allSet
        ? "card p-4 bg-emerald-500/10 ring-1 ring-emerald-400/30"
        : "card p-4 bg-amber-500/10 ring-1 ring-amber-400/30"}>
        <div className="flex items-start gap-3">
          {allSet
            ? <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
            : <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className={allSet ? "text-emerald-100 font-semibold" : "text-amber-100 font-semibold"}>
              {allSet ? "Ready to receive leads" : "Setup incomplete"}
            </div>
            <ul className="mt-2 space-y-1 text-xs font-mono">
              <li className={verifyTokenSet ? "text-emerald-300" : "text-amber-300"}>
                {verifyTokenSet ? "✓" : "✗"} META_VERIFY_TOKEN
              </li>
              <li className={appSecretSet ? "text-emerald-300" : "text-amber-300"}>
                {appSecretSet ? "✓" : "✗"} META_APP_SECRET (signature verification)
              </li>
              <li className={pageTokenSet ? "text-emerald-300" : "text-amber-300"}>
                {pageTokenSet ? "✓" : "✗"} META_PAGE_ACCESS_TOKEN (lead enrichment)
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 1 — Your webhook URL</h2>
        <p className="text-sm text-white/60">Paste this into Meta when prompted for "Callback URL".</p>
        <CopyField value={webhookUrl} />
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 2 — Set 3 env vars on Vercel</h2>
        <p className="text-sm text-white/60">
          Vercel → Project Settings → Environment Variables. Add all three, then redeploy.
        </p>
        <div className="space-y-3">
          <Env name="META_VERIFY_TOKEN" hint="Any random string. You'll paste the same string into Meta's 'Verify Token' field." />
          <Env name="META_APP_SECRET" hint="From your Meta app → Settings → Basic → 'App Secret'." />
          <Env name="META_PAGE_ACCESS_TOKEN" hint="Long-lived Page Access Token with leads_retrieval scope. Get it from Graph API Explorer or via OAuth." />
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 3 — Subscribe in Meta</h2>
        <ol className="text-sm text-white/70 space-y-2 list-decimal pl-5">
          <li>Open <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="h-3 w-3" /></a> → your app → <strong>Webhooks</strong>.</li>
          <li>Add subscription → object: <code className="text-white">Page</code>.</li>
          <li>Callback URL: paste the URL above.</li>
          <li>Verify Token: paste the same string you set in <code>META_VERIFY_TOKEN</code>.</li>
          <li>Click <strong>Verify and Save</strong> — Meta sends a GET; this app echoes the challenge.</li>
          <li>Subscribe to the <code className="text-white">leadgen</code> field.</li>
          <li>Under <strong>Marketing API</strong> → <strong>Page subscriptions</strong>, subscribe your Facebook Page to the app.</li>
        </ol>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 4 — Create the lead form</h2>
        <p className="text-sm text-white/60">
          In Meta Ads Manager → <strong>All Tools</strong> → <strong>Instant Forms</strong> → <strong>Create Form</strong>.
        </p>
        <p className="text-sm text-white/60">
          Required fields so leads pass the quality filter (name + phone + MA + intent):
        </p>
        <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
          <li><strong>Full name</strong> (or first + last)</li>
          <li><strong>Phone number</strong></li>
          <li><strong>City</strong> or <strong>Zip code</strong></li>
          <li>Custom question — "What kind of work do you need?" with options:
            <span className="block ml-3 mt-1 text-xs font-mono text-white/50">
              Kitchen · Bathroom · Basement · Roofing · Siding · Painting · Electrical · Plumbing · HVAC · Addition · Flooring · Other
            </span>
          </li>
        </ul>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 5 — Launch a campaign</h2>
        <p className="text-sm text-white/60">
          Ads Manager → Create campaign → <strong>Leads</strong> objective → location: <strong>Massachusetts</strong>. Recommended: $10–25/day budget, image of finished work, headline like "Get a free quote from a licensed MA contractor — same-day reply." Connect your lead form.
        </p>
        <p className="text-xs text-white/40">
          New leads will appear in <code>/marketplace</code> within ~30 seconds of form submission.
        </p>
      </section>
    </div>
  );
}

function Env({ name, hint }: { name: string; hint: string }) {
  return (
    <div>
      <div className="text-xs font-mono text-white/80">{name}</div>
      <div className="text-xs text-white/50 mt-0.5">{hint}</div>
    </div>
  );
}
