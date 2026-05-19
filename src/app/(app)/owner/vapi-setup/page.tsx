import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ExternalLink, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { CopyField } from "@/app/(app)/integrations/CopyField";

export const dynamic = "force-dynamic";

export default async function VapiSetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const h = headers();
  const host = h.get("host") ?? "your-app.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const webhookUrl = `${baseUrl}/api/voice/vapi-inbound`;

  const apiKeySet  = Boolean(process.env.VAPI_API_KEY);
  const secretSet  = Boolean(process.env.VAPI_WEBHOOK_SECRET);
  const ownerPhone = Boolean(process.env.OWNER_PHONE);
  const allSet     = apiKeySet && secretSet && ownerPhone;

  const systemPrompt = `You are the friendly AI receptionist for a Massachusetts contractor. Your job is to qualify a homeowner caller in under 90 seconds and capture: their name, phone, project type (kitchen / bath / roof / etc), property address or ZIP, and urgency.

Ground rules:
- Warm, professional, never pushy. Speak like you know the area.
- Confirm spelling of names and addresses. Read back the phone number.
- If they're a contractor or vendor (not a homeowner), thank them and end politely.
- If it's an emergency (active leak, no heat, etc), say "we'll get someone calling you within 5 minutes."
- Don't quote prices. Say "we'll send a free estimate after a quick consultation."
- End every call by saying "Davi or someone from the team will follow up within one business day."`;

  const structuredDataPrompt = `Extract from the call: name, phone, email, service_type (kitchen remodel / bathroom / roofing / etc), address, city, zip, urgency (asap / this month / flexible). Output JSON only.`;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Phone className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">AI <em>voice receptionist</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Vapi answers every inbound call automatically. The AI qualifies the lead in 90 seconds, captures name/phone/project/urgency, and posts the structured result here. You get an SMS within seconds for hot leads.
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
              {allSet ? "Ready to receive Vapi calls" : "Setup incomplete"}
            </div>
            <ul className="mt-2 space-y-1 text-xs font-mono">
              <li className={apiKeySet ? "text-emerald-300" : "text-amber-300"}>
                {apiKeySet ? "✓" : "✗"} VAPI_API_KEY (for outbound API calls — optional)
              </li>
              <li className={secretSet ? "text-emerald-300" : "text-amber-300"}>
                {secretSet ? "✓" : "✗"} VAPI_WEBHOOK_SECRET (HMAC signature verification)
              </li>
              <li className={ownerPhone ? "text-emerald-300" : "text-amber-300"}>
                {ownerPhone ? "✓" : "✗"} OWNER_PHONE (for hot-lead SMS alerts)
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 1 — Sign up for Vapi</h2>
        <ol className="text-sm text-white/70 space-y-2 list-decimal pl-5">
          <li><a href="https://dashboard.vapi.ai" target="_blank" rel="noreferrer" className="text-brand-300 hover:underline inline-flex items-center gap-1">dashboard.vapi.ai <ExternalLink className="h-3 w-3" /></a> — free credits to start.</li>
          <li>Click <strong>Phone Numbers</strong> → buy or port your business number (~$2/mo + per-min costs).</li>
          <li>Click <strong>Assistants</strong> → <strong>Create Assistant</strong>.</li>
        </ol>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 2 — Configure the assistant</h2>
        <div>
          <div className="text-xs font-medium text-white/70 mb-1">System Prompt</div>
          <CopyField value={systemPrompt} />
        </div>
        <div>
          <div className="text-xs font-medium text-white/70 mb-1">Structured Data prompt (set in Analysis → Structured Data)</div>
          <CopyField value={structuredDataPrompt} />
        </div>
        <p className="text-xs text-white/50">
          Recommended voice: ElevenLabs / Cartesia female mid-Atlantic. Recommended model: GPT-4o or Claude Sonnet. First-message: <code className="text-white/80">&quot;Hi! Thanks for calling A&amp;C. This is your AI assistant — what can we help you with today?&quot;</code>
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 3 — Webhook</h2>
        <p className="text-sm text-white/60">In Vapi → Assistant → <strong>Server URL</strong>, paste:</p>
        <CopyField value={webhookUrl} />
        <p className="text-sm text-white/60 mt-2">Subscribe to event: <code className="text-white">end-of-call-report</code> only.</p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 4 — Env vars on Vercel</h2>
        <div className="space-y-2 text-xs">
          <Env name="VAPI_WEBHOOK_SECRET"  hint="Random string. Paste the same string into Vapi → Assistant → Server URL Secret." />
          <Env name="VAPI_API_KEY"         hint="From Vapi → API Keys. Only needed if you trigger outbound calls programmatically." />
          <Env name="OWNER_PHONE"          hint="Your cell number (+15551234567). Hot lead SMS alerts go here." />
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Step 5 — Forward your business number</h2>
        <p className="text-sm text-white/60">
          From your existing business phone, set up <strong>conditional call forwarding</strong> to the Vapi number for: no-answer + busy + unreachable. The AI picks up only when you can&apos;t. (Or forward unconditionally if you&apos;d rather the AI screen every call.)
        </p>
        <p className="text-xs text-white/40">
          AT&amp;T: dial *61* + Vapi number + #. Verizon: dial *71 + Vapi number. iPhone: Settings → Phone → Call Forwarding.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">What happens after a call</h2>
        <ol className="text-sm text-white/70 list-decimal pl-5 space-y-1.5">
          <li>Vapi POSTs an <code>end-of-call-report</code> to the webhook with transcript + structured data.</li>
          <li>We verify the HMAC signature, parse the structured data, and create a <code>marketplace_leads</code> row tagged <code>source_channel=&quot;webhook&quot;</code>.</li>
          <li>Mirror cron (every 2 min) pushes it into your <code>/leads</code> pipeline.</li>
          <li>If the lead passes the quality gate (name + phone + MA + intent), you get an SMS at <code>OWNER_PHONE</code>: <span className="text-white">🔥 Voice lead: Jane · plumbing · asap · 02139. Call back: 555-1234</span></li>
        </ol>
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
