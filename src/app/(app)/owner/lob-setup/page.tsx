import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { CheckCircle2, Mail, AlertCircle, ExternalLink } from "lucide-react";
import { LobTestButton } from "./LobTestButton";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function LobSetupPage() {
  await requireModule("cf-marketplace");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const apiKeySet  = Boolean(process.env.LOB_API_KEY);
  const testKey    = process.env.LOB_API_KEY?.startsWith("test_") ?? false;
  const fromSet    = Boolean(process.env.LOB_FROM_LINE1 && process.env.LOB_FROM_CITY && process.env.LOB_FROM_ZIP);
  const phoneSet   = Boolean(process.env.LOB_OUTREACH_PHONE);
  const allSet     = apiKeySet && fromSet && phoneSet;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Mail className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Auto <em>postcards</em> via Lob</h1>
        <p className="mt-2 text-sm text-white/60">
          Every MA permit lead with a real name + street address gets a personalized
          postcard mailed in 1–2 business days. 1–3% response rate · ~$0.85/postcard.
          Lane B compliant (direct mail allowed without prior consent).
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
              {allSet ? `Postcards will auto-send every 6 hours${testKey ? " (TEST mode — no real mail)" : ""}` : "Setup incomplete"}
            </div>
            <ul className="mt-2 space-y-1 text-xs font-mono">
              <li className={apiKeySet ? "text-emerald-300" : "text-amber-300"}>
                {apiKeySet ? "✓" : "✗"} LOB_API_KEY {apiKeySet && testKey && <span className="text-amber-300">(test mode)</span>}
              </li>
              <li className={fromSet ? "text-emerald-300" : "text-amber-300"}>
                {fromSet ? "✓" : "✗"} Return address (LOB_FROM_LINE1 / CITY / STATE / ZIP)
              </li>
              <li className={phoneSet ? "text-emerald-300" : "text-amber-300"}>
                {phoneSet ? "✓" : "✗"} LOB_OUTREACH_PHONE (printed on the postcard)
              </li>
            </ul>
          </div>
          <LobTestButton />
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 1 — Create a Lob account</h2>
        <ol className="text-sm text-white/70 space-y-2 list-decimal pl-5">
          <li>Go to <a href="https://dashboard.lob.com/signup" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline inline-flex items-center gap-1">dashboard.lob.com/signup <ExternalLink className="h-3 w-3" /></a> — free, no credit card needed to start.</li>
          <li>Verify your email.</li>
          <li>Click <strong>API Keys</strong> in the left sidebar.</li>
          <li>You&apos;ll see two keys: <code>test_*</code> (free, doesn&apos;t mail anything physical) and <code>live_*</code> (real money, real mail).</li>
          <li>Start with the <strong>test key</strong> to validate the integration. Switch to <code>live_*</code> once you&apos;ve added billing.</li>
        </ol>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 2 — Set env vars on Vercel</h2>
        <p className="text-sm text-white/60">
          Vercel → Project Settings → Environment Variables. Add these, then redeploy.
        </p>
        <div className="space-y-2 text-xs">
          <Env name="LOB_API_KEY"              hint="From Lob dashboard → API Keys. Start with test_*, switch to live_* later." />
          <Env name="LOB_FROM_NAME"            hint="Your business name on the return address." />
          <Env name="LOB_FROM_LINE1"           hint="Your street address (e.g. '123 Main St')." />
          <Env name="LOB_FROM_CITY"            hint="Your city." />
          <Env name="LOB_FROM_STATE"           hint="Your state (e.g. 'MA')." />
          <Env name="LOB_FROM_ZIP"             hint="Your zip code." />
          <Env name="LOB_OUTREACH_PHONE"       hint="The phone number printed on the postcard (your business line)." />
          <Env name="LOB_OUTREACH_WEBSITE"     hint="Website printed on the postcard (defaults to contractorflowstore.com)." />
          <Env name="LOB_DAILY_CAP"            hint="Max postcards per day. Default 50 = ~$42.50/day = ~$1,275/mo if running at cap." />
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 3 — Test the connection</h2>
        <p className="text-sm text-white/60">
          Click <strong>Test postcard</strong> in the green banner above. It sends a real postcard
          via the test key (no money, no actual mail) or a real one if you&apos;re on a live key.
          You&apos;ll see a preview URL of the rendered card.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 4 — Let it run</h2>
        <p className="text-sm text-white/60">
          A cron fires every 6 hours: pulls every fresh MA permit lead with a name + street
          address that hasn&apos;t been mailed yet, and sends a personalized postcard via Lob.
          Capped at <code>LOB_DAILY_CAP</code> (default 50) sends/day.
        </p>
        <p className="text-xs text-white/40">
          Cron path: <code>/api/cron/lob-postcard-blast</code> · schedule: <code>0 */6 * * *</code>
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Postcard template</h2>
        <p className="text-sm text-white/60">
          The defaults work out of the box. To customize the front/back design, set
          <code className="text-white/80"> LOB_POSTCARD_FRONT_HTML</code> and
          <code className="text-white/80"> LOB_POSTCARD_BACK_HTML</code> env vars with full HTML.
          Available variables: <code>{"{{first_name}}, {{address_line1}}, {{project_type}}, {{business_name}}, {{phone}}, {{website}}"}</code>.
        </p>
      </section>
    </div>
  );
}

function Env({ name, hint }: { name: string; hint: string }) {
  return (
    <div>
      <div className="font-mono text-white/80">{name}</div>
      <div className="text-white/50 mt-0.5">{hint}</div>
    </div>
  );
}
