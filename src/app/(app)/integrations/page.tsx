import { Facebook, Globe, Plug, Webhook } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "./CopyField";
import { SOURCE_CHANNEL_LABELS, type LeadSourceChannel } from "@/lib/lead-intake";

export const dynamic = "force-dynamic";

const SAMPLE_PAYLOAD = `{
  "name": "Jane Homeowner",
  "phone": "+15551234567",
  "email": "jane@example.com",
  "city": "Acton",
  "zip": "01720",
  "service_type": "Kitchen remodel",
  "budget": "15k_50k",
  "timeline": "one_to_three_months",
  "notes": "Looking to update cabinets and counters.",
  "source_channel": "webhook",
  "external_id": "your-system-id-123"
}`;

export default async function IntegrationsPage() {
  const supabase = createClient();

  // Per-source counts for the last 30 days.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("marketplace_leads")
    .select("source_channel,created_at")
    .gte("created_at", since);

  const counts: Record<LeadSourceChannel, number> = {
    google_ads: 0,    meta_facebook: 0,    meta_instagram: 0,
    website_form: 0,  marketplace_form: 0, webhook: 0,
    manual: 0,        scraped: 0,
  };
  for (const r of (data ?? []) as { source_channel: LeadSourceChannel }[]) {
    counts[r.source_channel] = (counts[r.source_channel] ?? 0) + 1;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://your-app.vercel.app";
  const webhookSet = Boolean(process.env.WEBHOOK_SECRET);

  const urls = {
    google:  `${baseUrl}/api/marketplace/google-ads`,
    meta:    `${baseUrl}/api/marketplace/meta`,
    generic: `${baseUrl}/api/marketplace/webhook`,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-5 w-5 text-brand-600" /> Integrations
        </h1>
        <p className="text-sm text-slate-500">
          Hook up your ad platforms — every form submission flows straight into the
          marketplace inventory, scored by AI and priced by source quality.
        </p>
      </header>

      {!webhookSet && (
        <div className="card p-4 border-amber-200 bg-amber-50 text-amber-900 text-sm">
          ⚠️ <strong>Set <code>WEBHOOK_SECRET</code> in your Vercel environment variables</strong> before
          configuring any integration. All endpoints reject requests without it.
        </div>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SourceTile name="Google Ads"        count={counts.google_ads}        tone="from-blue-500 to-sky-500" />
        <SourceTile name="Facebook Ads"      count={counts.meta_facebook}     tone="from-blue-600 to-indigo-600" />
        <SourceTile name="Instagram Ads"     count={counts.meta_instagram}    tone="from-pink-500 to-rose-500" />
        <SourceTile name="Webhook / Zapier"  count={counts.webhook}           tone="from-emerald-500 to-teal-500" />
      </section>

      {/* GOOGLE ADS */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold">Google Ads — Lead Form Asset</h2>
          <span className="badge bg-slate-100 text-slate-600 ring-slate-200 ml-auto">
            {counts.google_ads} lead{counts.google_ads === 1 ? "" : "s"} last 30 days
          </span>
        </div>
        <ol className="text-sm text-slate-700 list-decimal list-inside space-y-1">
          <li>In Google Ads → <strong>Assets</strong> → <strong>+ Asset</strong> → <strong>Lead form</strong>.</li>
          <li>Build your form (Service / Budget / Timeline / etc. — see field naming below).</li>
          <li>Scroll to <strong>Lead delivery options</strong> → <strong>Webhook integration</strong>.</li>
          <li>Paste the URL and key below into the matching fields. Click <strong>Send test data</strong>; you should see "Success".</li>
        </ol>

        <div>
          <div className="label">Webhook URL</div>
          <CopyField value={urls.google} />
        </div>
        <div>
          <div className="label">Key (paste as <code>google_key</code>)</div>
          <CopyField value={process.env.WEBHOOK_SECRET ?? "(set WEBHOOK_SECRET first)"} mask />
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-brand-700 font-medium">
            Recommended Google Ads form fields
          </summary>
          <ul className="mt-2 list-disc list-inside text-slate-600 space-y-0.5">
            <li><strong>Full Name</strong>, <strong>Phone Number</strong>, <strong>Email</strong>, <strong>ZIP</strong> (Google built-ins)</li>
            <li>Custom question: <em>"What service do you need?"</em> (we map any of:
              SERVICE, JOB_TYPE, PROJECT, WHAT_PROJECT, WHAT_SERVICE_DO_YOU_NEED)</li>
            <li>Custom question: <em>"Budget"</em> with options matching <code>under_5k / 5k_15k / 15k_50k / over_50k</code></li>
            <li>Custom question: <em>"Timeline"</em> matching <code>asap / one_to_three_months / three_to_six_months / flexible</code></li>
          </ul>
        </details>
      </section>

      {/* META */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold">Meta — Facebook & Instagram Lead Ads</h2>
          <span className="badge bg-slate-100 text-slate-600 ring-slate-200 ml-auto">
            {counts.meta_facebook + counts.meta_instagram} lead{counts.meta_facebook + counts.meta_instagram === 1 ? "" : "s"} last 30 days
          </span>
        </div>
        <p className="text-sm text-slate-700">
          Meta sends a webhook ping when someone submits a Lead Ad. To fetch the actual
          form fields, we call the Meta Graph API with a long-lived Page Access Token.
        </p>

        <div className="space-y-1">
          <div className="label">Webhook callback URL</div>
          <CopyField value={urls.meta} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="label">Verify token</div>
            <CopyField value={process.env.META_VERIFY_TOKEN ?? "(set META_VERIFY_TOKEN env var)"} mask />
            <p className="text-xs text-slate-500 mt-1">
              Add this to your Vercel env vars and paste into Meta's webhook setup.
            </p>
          </div>
          <div>
            <div className="label">Page Access Token (server-side)</div>
            <CopyField value={process.env.META_PAGE_ACCESS_TOKEN ? "(set ✓)" : "Not set"} mask />
            <p className="text-xs text-slate-500 mt-1">
              Optional — without it we still record leads but can't fetch their fields. Get a
              long-lived token from Meta Business Suite.
            </p>
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-brand-700 font-medium">Setup steps</summary>
          <ol className="mt-2 list-decimal list-inside text-slate-600 space-y-1">
            <li>Meta for Developers → create an app of type <strong>Business</strong>.</li>
            <li>Add product: <strong>Webhooks</strong>. Subscribe to <strong>Page</strong> object →
              <strong>leadgen</strong> field. Callback URL = the one above. Verify token = your value.</li>
            <li>Add product: <strong>Lead Ads CRM</strong>. Connect your Page.</li>
            <li>Generate a long-lived <strong>Page Access Token</strong> with
              <code>leads_retrieval</code> + <code>pages_manage_metadata</code> permissions
              (requires Meta App Review).</li>
            <li>Set <code>META_VERIFY_TOKEN</code> and <code>META_PAGE_ACCESS_TOKEN</code> in Vercel.</li>
            <li>Submit a test lead from your Lead Ads Testing Tool — it'll arrive in seconds.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">
            🛟 Easier alternative: connect Meta Lead Ads → Zapier → POST to our
            <em> Generic Webhook</em> URL below. No app review needed.
          </p>
        </details>
      </section>

      {/* GENERIC */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold">Generic webhook (Zapier / Make / n8n / custom)</h2>
        </div>
        <p className="text-sm text-slate-700">
          POST a JSON payload to this URL with{" "}
          <code>Authorization: Bearer &lt;WEBHOOK_SECRET&gt;</code>. Use this for Meta via
          Zapier, scraping pipelines, Typeform, or any other source.
        </p>

        <div>
          <div className="label">Endpoint</div>
          <CopyField value={urls.generic} />
        </div>
        <div>
          <div className="label">Authorization header</div>
          <CopyField value={`Bearer ${process.env.WEBHOOK_SECRET ?? "(set WEBHOOK_SECRET first)"}`} mask />
        </div>
        <div>
          <div className="label">Example body</div>
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs overflow-x-auto whitespace-pre">
{SAMPLE_PAYLOAD}
          </pre>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-brand-700 font-medium">Field reference</summary>
          <table className="mt-2 w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr><th className="font-medium py-1">Field</th><th className="font-medium py-1">Required</th><th className="font-medium py-1">Notes</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-1 font-mono">name</td><td>yes</td><td>Customer's full name</td></tr>
              <tr><td className="py-1 font-mono">service_type</td><td>yes</td><td>e.g. "Kitchen remodel"</td></tr>
              <tr><td className="py-1 font-mono">phone / email / city / zip / notes</td><td>no</td><td>String, may be omitted</td></tr>
              <tr><td className="py-1 font-mono">budget</td><td>no</td><td>under_5k / 5k_15k / 15k_50k / over_50k / unsure</td></tr>
              <tr><td className="py-1 font-mono">timeline</td><td>no</td><td>asap / one_to_three_months / three_to_six_months / flexible</td></tr>
              <tr><td className="py-1 font-mono">source_channel</td><td>no</td><td>{Object.keys(SOURCE_CHANNEL_LABELS).join(" / ")}</td></tr>
              <tr><td className="py-1 font-mono">external_id</td><td>no</td><td>Your system's ID — used to dedupe retries</td></tr>
            </tbody>
          </table>
        </details>
      </section>

      <section className="card p-6 bg-slate-50 border-slate-200">
        <h3 className="font-semibold">How pricing works</h3>
        <p className="mt-1 text-sm text-slate-700">
          Each lead's marketplace price = (base price by budget) × (AI intent score) ×
          (source quality multiplier). Google Ads → 1.5×, Meta → 1.0–1.2×, web form → 0.9×,
          scraped → 0.5×. Higher-intent + higher-budget leads cost contractors more — and convert better.
        </p>
      </section>
    </div>
  );
}

function SourceTile({
  name, count, tone,
}: {
  name: string;
  count: number;
  tone: string;
}) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 text-xs uppercase tracking-wider text-white/85">{name}</div>
      <div className="relative z-10 mt-1 text-3xl font-bold">{count}</div>
      <div className="relative z-10 text-xs text-white/80">leads · 30 days</div>
    </div>
  );
}
